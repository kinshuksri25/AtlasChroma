//Dependencies
import React, { Component } from 'react';
import { hot } from "react-hot-loader";
import { connect } from 'react-redux';

import {urls} from '../../../../lib/constants/contants';
import setUserAction from '../../store/actions/userActions';
import cookieManager from '../../Components/cookieManager';
import SimpleForm from '../../Forms/simpleform';
import httpsMiddleware from '../../middleware/httpsMiddleware';
import formConstants from '../../Forms/formConstants';

class StoryForm extends Component {

    constructor(props){
        super(props);
        this.state = {
            storyForm : "",
            priorityList : ["StoryPriority","Urgent","High","Medium","Low","OnHold"],
            contributorList : ["Contributors",...this.props.currentProject.contributors],
            currentMode: this.props.currentMode,
        };
        this.buildAddStoryForm = this.buildAddStoryForm.bind(this);
        this.onStoryAddHandler = this.onStoryAddHandler.bind(this);
    }

    componentDidMount(){
        if(this.state.currentMode == "ADD"){
            this.buildAddStoryForm();
        }else if(currentMode == "EDIT"){

        }
    }

    buildAddStoryForm(){
        this.setState({
            storyForm : <SimpleForm formAttributes = { formConstants.storyForm }
                        submitHandler = { this.onStoryAddHandler }
                        options = {[this.state.contributorList,this.state.priorityList]}
                        changeFieldNames = {[]}/> 
        });
    }

    onStoryAddHandler(formObject){
        let globalThis = this;
        if(formObject.formData.Priority != "" && formObject.formData.Contributor != ""){
            let headers = {"CookieID" : cookieManager.getUserSessionDetails()};
            formObject.formData.currentStatus = this.props.currentProject.boarddetails.templatedetails[0]._id;
            formObject.formData.projectID = this.props.currentProject._id;
            httpsMiddleware.httpsRequest(formObject.route, formObject.method, headers, formObject.formData, function(error,responseObject) {
                if((responseObject.STATUS != 200 && responseObject.STATUS != 201) || error){
                    if(error){
                        console.log(error);
                        //TODO --> errormsg div(ERR_CONN_SERVER)
                    }else{
                        //TODO --> errormsg div(errorMsg)
                    }
                }else{
                    let updatedUser = globalThis.props.user;
                    updatedUser.projects.map(project =>{
                        if(project._id == globalThis.props.currentProject._id){
                            project.storydetails.push(responseObject.PAYLOAD);
                        }
                    });
                    globalThis.props.setUserState(updatedUser);
                    globalThis.props.placeStories([responseObject.PAYLOAD]);
                }
            });
        }else{
            //priority or contributors is empty
        }
    }

    render(){
        return (<div> {this.state.storyForm} </div>);
    }
}

const mapStateToProps = (state) => {
    return {
        user: state.userStateReducer
    }
};

const mapDispatchToProps = dispatch => {
    return {
        setUserState: (userObject) => {
            dispatch(setUserAction(userObject));
        }
    };
};

export default connect(mapStateToProps,mapDispatchToProps)(StoryForm); 