#!/usr/bin/env python

#adapted from Conference Central by Wesley Chun(wesc+api@google.com)

from datetime import datetime

import endpoints
from protorpc import messages
from protorpc import message_types
from protorpc import remote

from google.appengine.api import memcache
from google.appengine.api import taskqueue
from google.appengine.ext import ndb

from models import ConflictException
from models import Profile
from models import ProfileForm
from models import ProfileMiniForm
from models import StringMessage
from models import BooleanMessage
from models import Activity
from models import ActivityForm
from models import ActivityForms
from models import ActivityQueryForm
from models import Tribe
from models import TribeForm
from models import TribeForms

from settings import WEB_CLIENT_ID
from settings import ANDROID_CLIENT_ID
from settings import IOS_CLIENT_ID
from settings import ANDROID_AUDIENCE

from utils import getUserId

EMAIL_SCOPE = endpoints.EMAIL_SCOPE
API_EXPLORER_CLIENT_ID = endpoints.API_EXPLORER_CLIENT_ID

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

DEFAULTS = {
    "time": "Time not specified",
    "approvalNeeded": False,
    "currentParticipants": 0,
}

ACTI_GET_REQUEST = endpoints.ResourceContainer(
    message_types.VoidMessage,
    websafeActivityKey=messages.StringField(1),
)

ACTI_POST_REQUEST = endpoints.ResourceContainer(
    ActivityForm,
    websafeActivityKey=messages.StringField(1),
)

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

@endpoints.api(name='activity', version='v1', audiences=[ANDROID_AUDIENCE],
    allowed_client_ids=[WEB_CLIENT_ID, API_EXPLORER_CLIENT_ID, ANDROID_CLIENT_ID, IOS_CLIENT_ID],
    scopes=[EMAIL_SCOPE])
class ActivityApi(remote.Service):

# - - - Tribe objects - - - - - - - - - - - - - - - - - -

    def _createTribeObject(self, request):
        """Create or update Tribe object, returning TribeForm/request."""
        data = (getattr(request, "tribename")).lower()
        tribe = Tribe(key=ndb.Key(Tribe, data),tribename=data)
        tribe.put()
        return request

    def _copyTribeToForm(self, tribe):
        """Copy relevant fields from Activity to ActivityForm."""
        tf = TribeForm()
        for field in tf.all_fields():
            setattr(tf, field.name, (getattr(tribe, field.name))) 
        return tf

    @endpoints.method(TribeForm, TribeForm, path='tribe',
            http_method='POST', name='createTribe')
    def createTribe(self, request):
        """Create new tribe."""
        return self._createTribeObject(request)

    @endpoints.method(message_types.VoidMessage, TribeForms,
            path='queryTribes',
            http_method='POST',
            name='queryTribes')
    def queryTribes(self, request):
        """Query for activities."""
        tribes = Tribe.query()
        
        # return individual TribeForm object per Tribe
        return TribeForms(
                items=[self._copyTribeToForm(tribe) for tribe in \
                tribes]
        )

# - - - Activity objects - - - - - - - - - - - - - - - - -

    def _copyActivityToForm(self, acti, displayName):
        """Copy relevant fields from Activity to ActivityForm."""
        af = ActivityForm()
        for field in af.all_fields():
            if hasattr(acti, field.name):
                # convert Date to date string; just copy others
                if field.name=='date':
                    setattr(af, field.name, str(getattr(acti, field.name)))
                elif field.name=='participants':
                    setattr(af, field.name, (",".join(getattr(acti, field.name))))
                else:
                    setattr(af, field.name, (getattr(acti, field.name))) 
            elif field.name == "websafeKey":
                setattr(af, field.name, acti.key.urlsafe())
        if displayName:
            setattr(af, 'organizerDisplayName', displayName)
        af.check_initialized()
        return af



    def _createActivityObject(self, request):
        """Create or update Activity object, returning ActivityForm/request."""
        # preload necessary data items
        user = endpoints.get_current_user()
        if not user:
            raise endpoints.UnauthorizedException('Authorization required')
        user_id = getUserId(user)

        if not request.tribe:
            raise endpoints.BadRequestException("Activity 'tribe' field required")

        # copy ActivityForm/ProtoRPC Message into dict
        data = {field.name: getattr(request, field.name) for field in request.all_fields()}
        del data['websafeKey']
        del data['organizerDisplayName']

        # add default values for those missing (both data model & outbound Message)
        for df in DEFAULTS:
            if data[df] in (None, []):
                data[df] = DEFAULTS[df]
                setattr(request, df, DEFAULTS[df])
        # convert dates from strings to Date objects
        if data['date']:
            data['date'] = datetime.strptime(data['date'][:10], "%Y-%m-%d").date()
        if data['time']:
            data['time'] = str(data['time'])+" "+data['ampm']
        del data['ampm']
        # generate Profile Key based on user ID and Activity
        # ID based on Profile key get Activity key from ID
        p_key = ndb.Key(Profile, user_id)
        a_id = Activity.allocate_ids(size=1, parent=p_key)[0]
        a_key = ndb.Key(Activity, a_id, parent=p_key)
        data['key'] = a_key
        data['organizerUID'] = user_id
        data['participants'] = []
         # creation of Activity & return (modified) ActivityForm
        Activity(**data).put()
        return request

    
    @ndb.transactional()
    def _updateActivityObject(self, request):
        user = endpoints.get_current_user()
        if not user:
            raise endpoints.UnauthorizedException('Authorization required')
        user_id = getUserId(user)

        # copy ActivityForm/ProtoRPC Message into dict
        data = {field.name: getattr(request, field.name) for field in request.all_fields()}

        # update existing activity
        acti = ndb.Key(urlsafe=request.websafeActivityKey).get()
        # check that activity exists
        if not acti:
            raise endpoints.NotFoundException(
                'No activity found with key: %s' % request.websafeActivityKey)

        # check that user is owner
        if user_id != acti.organizerUID:
            raise endpoints.ForbiddenException(
                'Only the owner can update the activity.')
        
        for field in request.all_fields():
            data = getattr(request, field.name)
            # only copy fields where there is new data
            if data not in (None, []):
                  # write to Activity object
                setattr(acti, field.name, data)
        acti.put()
        prof = ndb.Key(Profile, user_id).get()
        return self._copyActivityToForm(acti, getattr(prof, 'displayName'))


    @ndb.transactional(xg=True)
    def _activityRegistration(self, request, reg=True):
        """Register or unregister user for selected activity."""
        retval = None
        prof = self._getProfileFromUser() # get user Profile

        # check if acti exists given websafeActiKey
        # get activity; check that it exists
        wsak = request.websafeActivityKey
        acti = ndb.Key(urlsafe=wsak).get()
        if not acti:
            raise endpoints.NotFoundException(
                'No activity found with key: %s' % wsak)

        # register
        if reg:
            # check if user already registered otherwise add
            if wsak in prof.activityKeysToAttend:
                raise ConflictException(
                    "You have already registered for this activity")

            # check if seats avail
            if acti.maxParticipants==acti.currentParticipants:
                raise ConflictException(
                    "There are no places available.")

            # register user, take away one seat
            prof.activityKeysToAttend.append(wsak)
            acti.currentParticipants += 1
            acti.participants.append(prof.displayName)
            retval = True

        # unregister
        else:
            # check if user already registered
            if wsak in prof.activityKeysToAttend:

                # unregister user, add back one seat
                prof.activityKeysToAttend.remove(wsak)
                acti.currentParticipants -= 1
                acti.participants.remove(prof.displayName)
                retval = True
            else:
                retval = False

        # write things back to the datastore & return
        prof.put()
        acti.put()
        return BooleanMessage(data=retval)
  
    @endpoints.method(ActivityForm, ActivityForm, path='activity',
            http_method='POST', name='createActivity')
    def createActivity(self, request):
        """Create new activity."""
        return self._createActivityObject(request)


    @endpoints.method(ACTI_POST_REQUEST, ActivityForm,
            path='activity/{websafeActivityKey}',
            http_method='PUT', name='updateActivity')
    def updateActivity(self, request):
        """Update activity w/provided fields & return w/updated info."""
        return self._updateActivityObject(request)


    @endpoints.method(ACTI_GET_REQUEST, ActivityForm,
            path='activity/{websafeActivityKey}',
            http_method='GET', name='getActivity')
    def getActivity(self, request):
        """Return requested activity (by websafeActivityKey)."""
        # get Activity object from request; bail if not found
        acti = ndb.Key(urlsafe=request.websafeActivityKey).get()
        if not acti:
            raise endpoints.NotFoundException(
                'No activity found with key: %s' % request.websafeActivityKey)
        prof = acti.key.parent().get()
        # return ActivityForm
        return self._copyActivityToForm(acti, getattr(prof, 'displayName'))


    @endpoints.method(message_types.VoidMessage, ActivityForms,
            path='getActivitiesCreated',
            http_method='POST', name='getActivitiesCreated')
    def getActivitiesCreated(self, request):
        """Return activities created by user."""
        # make sure user is authed
        user = endpoints.get_current_user()
        if not user:
            raise endpoints.UnauthorizedException('Authorization required')
        user_id = getUserId(user)

        # create ancestor query for all key matches for this user
        actis = Activity.query(ancestor=ndb.Key(Profile, user_id))
        prof = ndb.Key(Profile, user_id).get()
        # return set of ActivityForm objects per Activity
        return ActivityForms(
            items=[self._copyActivityToForm(acti, getattr(prof, 'displayName')) for acti in actis]
        )


    @endpoints.method(message_types.VoidMessage, ActivityForms,
            path='activities/attending',
            http_method='GET', name='getActivitiesToAttend')
    def getActivitiesToAttend(self, request):
        """Get list of activities that user has registered for."""
        prof = self._getProfileFromUser() # get user Profile
        acti_keys = [ndb.Key(urlsafe=wsak) for wsak in prof.activityKeysToAttend]
        activities = ndb.get_multi(acti_keys)

        # get organizers
        organisers = [ndb.Key(Profile, acti.organizerUID) for acti in activities]
        profiles = ndb.get_multi(organisers)

        # put display names in a dict for easier fetching
        names = {}
        for profile in profiles:
            names[profile.key.id()] = profile.displayName

        # return set of ActivityForm objects per Activity
        return ActivityForms(items=[self._copyActivityToForm(acti, names[acti.organizerUID])\
         for acti in activities]
        )


    @endpoints.method(ACTI_GET_REQUEST, BooleanMessage,
            path='activity/{websafeActivityKey}',
            http_method='POST', name='registerForActivity')
    def registerForActivity(self, request):
        """Register user for selected activity."""
        return self._activityRegistration(request)


    @endpoints.method(ACTI_GET_REQUEST, BooleanMessage,
            path='activity/{websafeActivityKey}',
            http_method='DELETE', name='unregisterFromActivity')
    def unregisterFromActivity(self, request):
        """Unregister user for selected activity."""
        return self._activityRegistration(request, reg=False)

    @endpoints.method(ActivityQueryForm, ActivityForms,
            path='queryActivities',
            http_method='POST',
            name='queryActivities')
    def queryActivities(self, request):
        """Query for activities."""
        activities = Activity.query()
        if request.fil:
            activities = Activity.query(Activity.tribe==request.fil)
        # need to fetch organiser displayName from profiles
        # get all keys and use get_multi for speed
        organisers = [(ndb.Key(Profile, acti.organizerUID)) for acti in activities]
        profiles = ndb.get_multi(organisers)

        # put display names in a dict for easier fetching
        names = {}
        for profile in profiles:
            names[profile.key.id()] = profile.displayName

        # return individual ActivityForm object per Activity
        return ActivityForms(
                items=[self._copyActivityToForm(acti, names[acti.organizerUID]) for acti in \
                activities]
        )

# - - - Profile objects - - - - - - - - - - - - - - - - - - -

    def _copyProfileToForm(self, prof):
        """Copy relevant fields from Profile to ProfileForm."""
        # copy relevant fields from Profile to ProfileForm
        pf = ProfileForm()
        for field in pf.all_fields():
            if hasattr(prof, field.name):
                setattr(pf, field.name, getattr(prof, field.name))
        pf.check_initialized()
        return pf


    def _getProfileFromUser(self):
        """Return user Profile from datastore, creating new one if non-existent."""
        # make sure user is authed
        user = endpoints.get_current_user()
        if not user:
            raise endpoints.UnauthorizedException('Authorization required')

        # get Profile from datastore
        user_id = getUserId(user)
        p_key = ndb.Key(Profile, user_id)
        profile = p_key.get()
        # create new Profile if not there
        if not profile:
            profile = Profile(
                key = p_key,
                displayName = user.nickname(),
                mainEmail= user.email(),
            )
            profile.put()
        # return Profile
        return profile     


    def _doProfile(self, save_request=None):
        """Get user Profile and return to user, possibly updating it first."""
        # get user Profile
        prof = self._getProfileFromUser()

        # if saveProfile(), process user-modifyable fields
        if save_request:
            for field in ('displayName', 'phoneNumber'):
                if hasattr(save_request, field):
                    val = getattr(save_request, field)
                    if val:
                        setattr(prof, field, (val))
                        prof.put()

        # return ProfileForm
        return self._copyProfileToForm(prof)


    @endpoints.method(message_types.VoidMessage, ProfileForm,
            path='profile', http_method='GET', name='getProfile')
    def getProfile(self, request):
        """Return user profile."""
        return self._doProfile()


    @endpoints.method(ProfileMiniForm, ProfileForm,
            path='profile', http_method='POST', name='saveProfile')
    def saveProfile(self, request):
        """Update & return user profile."""
        return self._doProfile(request)

# - - - Tribes - - - - - - - - - - - - - - - - - - - -
    
api = endpoints.api_server([ActivityApi]) 
