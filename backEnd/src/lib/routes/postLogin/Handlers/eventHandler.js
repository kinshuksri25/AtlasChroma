/*
* Event Handlers
*/

//Dependencies
const mongo = require("../../../utils/data");
const {EMSG,SMSG,SINGLE,MULTIPLE,OAuthCONST,EMAILTEMPLATES,DBCONST} = require("../../../../../../lib/constants/contants");
const googleApis = require("../../../googleApis/googleAPI");
const helperFunctions = require("../../../utils/helper");
const {randValueGenerator,generateCurrentDate} = require("../../../utils/helper");
const project = require("../../../classObjects/projectClass");

//declaring the module
const eventHandler = {};

//router for all the event routes
//params --> route - string, requestObject - object
//returns --> promise - object
eventHandler.event = (route,requestObject) => new Promise((resolve,reject) => {

    let response = {
        EMSG : "",
        PAYLOAD : {},
        SMSG : ""
       };
    if(requestObject.hasOwnProperty("method")){
        switch(requestObject.method){
          case "GET" :
              break;
          case "POST" : 
            eventHandler.event.post(route,requestObject).then(resolvedResult => {
                   resolve(resolvedResult);
              }).catch(rejectedResult => {
                   reject(rejectedResult);
              });
              break;
          case "PUT" :
            eventHandler.event.put(route,requestObject).then(resolvedResult => {
                    resolve(resolvedResult);
                }).catch(rejectedResult => {
                    reject(rejectedResult);
                }); 
              break;
          case "DELETE" : 
            eventHandler.event.delete(route,requestObject).then(resolvedResult => {
                    resolve(resolvedResult);
                }).catch(rejectedResult => {
                    reject(rejectedResult);
                }); 
              break;
        }
    }else{
      response.STATUS = 500;
      response.EMSG = EMSG.SVR_HDNLS_MTHNTFND;
      reject(response);
    }
});

//event post route
//params --> route - string, requestObject - object
//returns --> promise - object
eventHandler.event.post = (route, requestObject) => new Promise((resolve,reject) => {
    let response = {
        EMSG : "",
        PAYLOAD : {},
        SMSG : ""
       };
    requestObject.reqBody.eventObject._id = randValueGenerator();
    if(requestObject.reqBody.hasOwnProperty("eventObject")){
        let isMeeting = requestObject.reqBody.eventObject.EventType == "Meeting" ? true : false;
        let query = isMeeting ? {username : {$in : [...requestObject.reqBody.eventObject.participants]}} : {_id : requestObject.cookieid};
        requestObject.reqBody.eventObject.password = helperFunctions.randValueGenerator(6);
        mongo.update(DBCONST.userCollection , query,{$push:{events : {...requestObject.reqBody.eventObject}}},{},MULTIPLE).then(resolvedSet => {
            if(isMeeting){
                mongo.read(DBCONST.userCollection,{username : {$in : [...requestObject.reqBody.eventObject.participants]}},{projection : {email : 1 ,_id : 0}}).then(resolvedSet => {
                    let recipientList = [];
                    resolvedSet.map(user => {
                        recipientList.push(user.email);
                    });
                    let meetingDate = requestObject.reqBody.eventObject.CreationYear+"-"+requestObject.reqBody.eventObject.CreationMonth+"-"+requestObject.reqBody.eventObject.CreationDate;
                    let template = {
                        "meetingName" : requestObject.reqBody.eventObject.EventTitle,
                        "meetingLink" : "",
                        "date" : meetingDate,
                        "startTime" : requestObject.reqBody.eventObject.StartTime,
                        "participants" : [...requestObject.reqBody.eventObject.participants],
                        "creator" : requestObject.reqBody.eventObject.creator
                    };
                    let payload = {eventID : requestObject.reqBody.eventObject._id,password : requestObject.reqBody.eventObject.password};
                    googleApis.sendEmail(OAuthCONST.appAuth.senderEmail,recipientList,OAuthCONST.appAuth.sendEmailRefreshToken,OAuthCONST.appAuth.clientID,OAuthCONST.appAuth.clientSecret,EMAILTEMPLATES.ADDEVENT,template).then(resolvedResult => {
                        response.STATUS = 200;
                        response.PAYLOAD = {...payload};
                        response.SMSG = "board details updated successfully";
                        resolve(response);
                    }).catch(rejectedResult => {
                        let payload = {
                            "participants" : [...recipientList],
                            "template" : "ADDEVENT",
                            "templateData" : template
                        };
                        mongo.insert(DBCONST.failedEmailCollection, {payload}, {});
                        response.STATUS = 201;
                        response.PAYLOAD = {...payload};
                        response.SMSG = "board details updated successfully, unable to nortify the contributor"; //add a cron here
                        resolve(response);    
                    });
                }).catch(rejectedSet => {
                    throw rejectedSet; 
                });
            }else{
                response.STATUS = 200;
                response.PAYLOAD = {eventID : requestObject.reqBody.eventObject._id};
                response.SMSG = "board details updated successfully";
                resolve(response); 
            }
        }).catch(rejectedSet => {
            throw rejectedSet; 
        });
    }else{
        response.STATUS = 400;
        response.EMSG = EMSG.SVR_HNDLS_INREQ;
        reject(response);
    }
});

//event put route
//params --> route - string, requestObject - object
//returns --> promise - object
eventHandler.event.put = (route, requestObject) => new Promise((resolve,reject) => {
    let response = {
        EMSG : "",
        PAYLOAD : {},
        SMSG : ""
       };
    if(requestObject.reqBody.hasOwnProperty("EventTitle") || requestObject.reqBody.hasOwnProperty("Description") ||
        requestObject.reqBody.hasOwnProperty("EventType") || requestObject.reqBody.hasOwnProperty("StartTime") ||
            requestObject.reqBody.hasOwnProperty("EndTime")){
                
                let set = {}; 
                let updateQuery = {};
                if(requestObject.reqBody.hasOwnProperty("EventTitle")){
                    set["events.$.EventTitle"] = requestObject.reqBody.EventTitle;
                }if(requestObject.reqBody.hasOwnProperty("Description")){
                    set["events.$.Description"] = requestObject.reqBody.Description;
                }if(requestObject.reqBody.hasOwnProperty("StartTime")){
                    set["events.$.StartTime"] = requestObject.reqBody.StartTime;
                }if(requestObject.reqBody.hasOwnProperty("EndTime")){
                    set["events.$.EndTime"] = requestObject.reqBody.EndTime;
                }if(requestObject.reqBody.hasOwnProperty("participants")){
                    set["events.$.participants"] = requestObject.reqBody.participants;
                }

                set.modificationdate = generateCurrentDate();
                if(JSON.stringify(set)!=JSON.stringify({})){
                    updateQuery["$set"] = {...set};
                }
                mongo.update(DBCONST.userCollection,{"events._id" : requestObject.reqBody._id},{$set : {...set}},{},MULTIPLE).then(resolvedSet => {
                   if(requestObject.reqBody.EventType != "Meeting"){
                        response.STATUS = 200;
                        response.PAYLOAD = {};
                        response.SMSG = "event edited successfully";
                        resolve(response);
                   }else{
                        let template = {
                            "meetingLink" : "",
                            "meetingName" : requestObject.reqBody.oldTitle
                        };
                        mongo.read(DBCONST.userCollection,{"events._id" : {$eq : requestObject.reqBody._id}},{projection : {email : 1, _id :0}}).then(resolvedSet => {
                            let recipientList = [];
                            resolvedSet.map(user => {
                                recipientList.push(user.email);
                            });
                            googleApis.sendEmail(OAuthCONST.appAuth.senderEmail,recipientList,OAuthCONST.appAuth.sendEmailRefreshToken,OAuthCONST.appAuth.clientID,OAuthCONST.appAuth.clientSecret,EMAILTEMPLATES.EDITEVENT,template).then(resolvedResult => {
                                response.STATUS = 200;
                                response.PAYLOAD = {};
                                response.SMSG = "event edited successfully";
                                resolve(response);
                            }).catch(rejectedResult => {
                                let payload = {
                                    "participants" : [...recipientList],
                                    "template" : "EDITEVENT",
                                    "templateData" : template
                                };
                                mongo.insert(DBCONST.failedEmailCollection, {payload}, {});
                                response.STATUS = 201;
                                response.PAYLOAD = {};
                                response.SMSG = "event edited successfully, unable to nortify the contributor"; //add a cron here
                                resolve(response);    
                            });
                        }).catch(rejectedSet => {
                            throw rejectedSet;
                        });                
                   }            
                }).catch(rejectedSet => {
                    response.STATUS = 500;
                    response.EMSG = rejectedSet;
                    reject(response);
                });
              
    }else{
        response.STATUS = 400;
        response.EMSG = EMSG.SVR_HNDLS_INREQ;
        reject(response); 
    }
});

//event delete route
//params --> route - string, requestObject - object
//returns --> promise - object
eventHandler.event.delete = (route, requestObject) => new Promise((resolve,reject) => {
    let response = {
        EMSG : "",
        PAYLOAD : {},
        SMSG : ""
       };

    if(requestObject.queryObject.eventID != undefined){

        mongo.update(DBCONST.userCollection,{"events._id" : {$eq : requestObject.queryObject.eventID}},{ $pull: {events : {_id: requestObject.queryObject.eventID}}},{},MULTIPLE).then(resultSet => {
            if(requestObject.queryObject.EventType == "Meeting"){
                mongo.read(DBCONST.userCollection,{"events._id" : {$eq : requestObject.queryObject.eventID}},{projection : {email : 1, _id :0}}).then(resolvedSet => {
                    let recipientList = [];
                    resolvedSet.map(user => {
                        recipientList.push(user.email);
                    });
                    let template = {
                        eventName : requestObject.queryObject.eventName
                    };
                    googleApis.sendEmail(OAuthCONST.appAuth.senderEmail,recipientList,OAuthCONST.appAuth.sendEmailRefreshToken,OAuthCONST.appAuth.clientID,OAuthCONST.appAuth.clientSecret,EMAILTEMPLATES.DELETEEVENT,template).then(resolvedResult => {
                        response.STATUS = 200;
                        response.PAYLOAD = {};
                        response.SMSG = "Event deleted successfully";    
                        resolve(response);  
                    }).catch(rejectedResult => {
                        let payload = {
                            "participants" : [...recipientList],
                            "template" : "DELETEEVENT",
                            "templateData" : template
                        };
                        mongo.insert(DBCONST.failedEmailCollection, {payload}, {});
                        response.STATUS = 201;
                        response.PAYLOAD = {};
                        response.SMSG = "Event deleted successfully, unable to nortify the user";
                        reject(response); 
                    });
                }).catch(rejectedSet => {
                    throw rejectedSet;
                });    
            }else{
                response.STATUS = 200;
                response.PAYLOAD = {};
                response.SMSG = "Event deleted successfully";    
                resolve(response);  
            }
        }).catch(rejectedSet => {
            //need to add a cron here 
            response.STATUS = 500;
            response.EMSG = rejectedSet;
            reject(response); 
        });
    }else{
        response.STATUS = 400;
        response.EMSG = EMSG.SVR_HNDLS_INREQ;
        reject(response); 
    }
});

//export the module
module.exports = eventHandler;