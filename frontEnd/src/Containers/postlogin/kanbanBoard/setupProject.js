//Dependencies
import React, { Component } from 'react';
import { hot } from "react-hot-loader";
import { connect } from 'react-redux';

import Modal from 'react-modal';
import "../../../StyleSheets/setupProject.css";
import SimpleForm from '../../../Forms/simpleform';
import httpsMiddleware from '../../../middleware/httpsMiddleware';
import formConstants from '../../../Forms/formConstants';
import TemplateBuilder from './templateBuilder';
import setMsgAction from '../../../store/actions/msgActions';
import cookieManager from '../../../Components/cookieManager';
import templateBuilderConstants from './templateBuilderConstants';

class SetupProject extends Component {

    constructor(props){
        super(props);
        this.state = {
            currentProject : {},
            nextPage : false,
            currentTemplate: "" ,
            toggleConfirmationModal : false
        };
        this.formBuilder = this.formBuilder.bind(this);
        this.changePage = this.changePage.bind(this);
        this.templateValidator = this.templateValidator.bind(this);
        this.setLoadedTemplate = this.setLoadedTemplate.bind(this);
        this.onTemplateSubmit = this.onTemplateSubmit.bind(this);
        this.randValueGenerator = this.randValueGenerator.bind(this);
        this.toggleConfirmationModal = this.toggleConfirmationModal.bind(this);
        
    }
    
    componentDidMount(){ 
        let projectID = window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1);
        let projectObject = {};
        this.props.user.projects.map(project => {
            if(project._id == projectID)
                    projectObject = project;      
        });
        this.setState({currentProject:{...projectObject}});
    }

    formBuilder(){
        if(!this.state.nextPage){
           return(<div className = "template">
                    <SimpleForm formAttributes = { formConstants.boardTemplateSelector }
                        submitHandler = { this.changePage }
                        options = {[["Template Type","SIMPLE","SDLC","MANUFACTURING","CUSTOM"]]}
                        changeFieldNames = {[]} />
                  </div>);
        }else{
            let constants = [];
            switch(this.state.currentTemplate){
                case "SIMPLE" : 
                    constants = templateBuilderConstants.SIMPLE;
                    break;
                case "SDLC" : 
                    constants = templateBuilderConstants.SDLC;
                    break;
                case "MANUFACTURING" : 
                    constants = templateBuilderConstants.MANUFACTURING;
                    break;
                case "CUSTOM" : 
                    constants = templateBuilderConstants.CUSTOM;
                    break;    
            }
            constants.map(constant => {
                constant.WIP = constant.WIP ? this.state.currentProject.contributors.length + 2 : false;
                constant._id = this.randValueGenerator();
                   
            });
            return(<div className="template">
                      <TemplateBuilder template={constants} setLoadedTemplate = {this.setLoadedTemplate} randValueGenerator ={this.randValueGenerator}/>
                      <div className="buttonContainer">
                        <button className="templateBackButton" onClick={this.changePage}>&lt;</button>
                        <button className="submitTemplate" onClick={this.toggleConfirmationModal} hidden={!this.state.nextPage} disabled={this.state.currentTemplate == "" ? true : this.state.currentProject.templatedetails.length ==0 ? true : false}>&gt;</button>
                      </div>
                      <Modal
                        isOpen={this.state.toggleConfirmationModal}>
                            <button onClick={this.toggleConfirmationModal}>X</button>
                            <h5>The last phase in this workflow seemns to be {}, and will be marked as the end of the workflow. If you need a different phase to be the end please make the necessary changes and contiue.</h5>
                            <button onClick={this.onTemplateSubmit}>&gt;</button>
                      </Modal>
                    </div>);
        }
    }

    setLoadedTemplate(template){
        let currentProject = {...this.state.currentProject};
        currentProject.templatedetails = template;
        this.setState({currentProject : {...currentProject}});
    }

    templateValidator(){
        let finalTemplate = [...this.state.currentProject.templatedetails];
        let isTemplateValid = true;
        finalTemplate.map(template => {
            if(template.CHILDREN.length == 1){
                isTemplateValid = false;
            }
        });
        return isTemplateValid;
    }

    onTemplateSubmit(event){
        let globalThis = this;
        let errorObject = {};
        if(this.templateValidator()){
            let headers = {"CookieID" : cookieManager.getUserSessionDetails()};
            let finalTemplate = [...globalThis.state.currentProject.templatedetails];
            finalTemplate[finalTemplate.length-1].workFlowEnd = true;
            httpsMiddleware.httpsRequest("/project", "PUT", headers,{oldContributors : [...globalThis.state.currentProject.contributors],contributors : [...globalThis.state.currentProject.contributors],templatedetails : [...finalTemplate],projectID : globalThis.state.currentProject._id},function(error,responseObject) {
                if((responseObject.STATUS != 200 && responseObject.STATUS != 201) || error){
                    if(error){
                        errorObject.msg = error;
                        errorObject.status = "ERROR";
                        globalThis.props.setMsgState(errorObject);
                    }else{
                        errorObject.msg = responseObject.EMSG;
                        errorObject.status = "ERROR";
                        globalThis.props.setMsgState(errorObject);
                    }
                } 
            });
        }else{
            errorObject.msg = EMSG.CLI_PRJSTP_INVLDPHS;
            errorObject.status = "ERROR";
            globalThis.props.setMsgState(errorObject);
        }
    }

    changePage(formObject){
        if(formObject.hasOwnProperty("formData")){
            if(formObject.formData.TemplateType != ""){
                let templateType = formObject.formData.TemplateType;
                this.setState({nextPage : true, currentTemplate: templateType});   
            }else{
                errorObject.msg = EMSG.CLI_PRJSTP_INVLDTMP;
                errorObject.status = "ERROR";
                this.props.setMsgState(errorObject);
            }
        }
        else
            this.setState({nextPage : false, currentTemplate: ""});   
    }

    randValueGenerator(valueLength = 10){
        let randomValue = "";
        let saltString = "0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ";
        let i = 0;
        while(i<=valueLength){
          randomValue += saltString[Math.floor((Math.random() * saltString.length))];
          i++;
        }
        return randomValue;
    }

    toggleConfirmationModal(){
        this.setState({toggleConfirmationModal : !this.state.toggleConfirmationModal});
    }

    render(){
        let setupContainer = this.formBuilder();
        return(<div className="projectSetup">
                    {setupContainer}
               </div>);
    }
}

const mapStateToProps = (state) => {
    return {
        user: state.userStateReducer
    }
};

const mapDispatchToProps = dispatch => {
    return {
        setMsgState: (msgObject) => {
            dispatch(setMsgAction(msgObject));
        } 
    };
};

export default connect(mapStateToProps,mapDispatchToProps)(SetupProject);
