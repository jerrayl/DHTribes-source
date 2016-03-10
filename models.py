#!/usr/bin/env python

import httplib
import endpoints
from protorpc import messages
from google.appengine.ext import ndb

class ConflictException(endpoints.ServiceException):
    """ConflictException -- exception mapped to HTTP 409 response"""
    http_status = httplib.CONFLICT

class Profile(ndb.Model):
    """Profile -- User profile object"""
    displayName = ndb.StringProperty()
    mainEmail = ndb.StringProperty()
    phoneNumber = ndb.IntegerProperty()
    activityKeysToAttend = ndb.StringProperty(repeated=True)

class ProfileMiniForm(messages.Message):
    """ProfileMiniForm -- update Profile form message"""
    displayName = messages.StringField(1)
    phoneNumber = messages.IntegerField(2, variant=messages.Variant.INT32)

class ProfileForm(messages.Message):
    """ProfileForm -- Profile outbound form message"""
    displayName = messages.StringField(1)
    mainEmail = messages.StringField(2)
    phoneNumber = messages.IntegerField(3, variant=messages.Variant.INT32)
    activityKeysToAttend = messages.StringField(4, repeated=True)

class StringMessage(messages.Message):
    """StringMessage-- outbound (single) string message"""
    data = messages.StringField(1, required=True)

class BooleanMessage(messages.Message):
    """BooleanMessage-- outbound Boolean value message"""
    data = messages.BooleanField(1)

class Tribe(ndb.Model):
    """Tribe -- Tribe object"""
    tribename = ndb.StringProperty(required=True)
    
class TribeForm(messages.Message):
    """TribeForm == Tribe outbound form message"""
    tribename = messages.StringField(1)
    
class Activity(ndb.Model):
    """Activity -- Activity object"""
    tribe            	= ndb.StringProperty(required=True)
    description         = ndb.StringProperty()
    organizerUID        = ndb.StringProperty()
    location            = ndb.StringProperty()
    date                = ndb.DateProperty()
    time                = ndb.StringProperty()
    maxParticipants     = ndb.IntegerProperty()
    currentParticipants = ndb.IntegerProperty()
    waitingList         = ndb.IntegerProperty()
    approvalNeeded      = ndb.BooleanProperty()
    participants        = ndb.StringProperty(repeated=True)
    waiting             = ndb.StringProperty(repeated=True)

class ActivityForm(messages.Message):
    """ActivityForm -- Activity outbound form message"""
    tribe            	 = messages.StringField(1)
    description          = messages.StringField(2)
    organizerUID         = messages.StringField(3)
    location             = messages.StringField(4)
    date                 = messages.StringField(5)
    time                 = messages.StringField(6)
    maxParticipants      = messages.IntegerField(7, variant=messages.Variant.INT32)
    currentParticipants  = messages.IntegerField(8, variant=messages.Variant.INT32)
    approvalNeeded       = messages.BooleanField(9)
    websafeKey           = messages.StringField(10)
    organizerDisplayName = messages.StringField(11)
    participants         = messages.StringField(12)
    ampm                 = messages.StringField(13)

class ActivityForms(messages.Message):
    """ActivityForms -- multiple Activity outbound form message"""
    items = messages.MessageField(ActivityForm, 1, repeated=True)

class TribeForms(messages.Message):
    """TribeForms -- multiple Tribe outbound form message"""
    items = messages.MessageField(TribeForm, 1, repeated=True)

class ActivityQueryForm(messages.Message):
    """ActivityQueryForm -- Activity query inbound form message"""
    fil = messages.StringField(1)

