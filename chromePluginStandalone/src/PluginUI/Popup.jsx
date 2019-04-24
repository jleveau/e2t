import React from 'react';
import { render } from 'react-dom';

import {Grid, PageHeader, Row, Col} from 'react-bootstrap';

const MODES = {
    INPUT: 'input',
    EXPLORE: 'explore',
    STOP: 'stop'
};

class Popup extends React.Component {

	constructor(props) {
		super(props);
        this.state = {
            mode : MODES.STOP
        };     
        this.handleInput = this.handleInput.bind(this);
        this.handleExplore = this.handleExplore.bind(this);
        this.handleStop = this.handleStop.bind(this);
        chrome.runtime.sendMessage({
            kind: 'getState'
        }, {}, state => this.setState(state));
    }

    handleInput(event) {
        event.preventDefault();
        if (this.state.mode !== MODES.INPUT) {
            chrome.windows.getCurrent({populate:true}, window => {
                chrome.windows.getCurrent({populate:true}, window => {
                    chrome.runtime.sendMessage(
                        { kind: 'startRegisteringInputs', windowId: window.id},
                        response => this.setState(response)
                    );
                });
            });
        }
    }

    handleExplore(event) {
        event.preventDefault();
        if (this.state.mode !== MODES.EXPLORE) {
			chrome.windows.getCurrent({populate:true}, window => {
                chrome.runtime.sendMessage(
                    { kind: 'startExpedition', windowId: window.id},
                    response => this.setState(response)
                );
            });
        } 
    }
    
    handleStop(event) {
        event.preventDefault();
        if (this.state.mode !== MODES.STOP) {
            chrome.windows.getCurrent({populate:true}, window => {
                chrome.runtime.sendMessage(
                    { kind: 'stopExpedition', windowId: window.id},
                    response => {
                        this.setState(response)
                    }
                );
            });
         }
    }

	render() {
        let record = <Row>
                <Col xs={12} style={{fontSize:24}}>Mode</Col>
                <Col xs={4}>
                    <div class="btn-group" role="group">
                        <button className={`btn ${this.state.mode === "input" ?"btn-primary":"btn-secondary"}`}
                                key="input"
                                type="button"
                                onClick={this.handleInput}>
                                Inputs
                        </button>

                        <button className={`btn ${this.state.mode === "explore" ?"btn-primary":"btn-secondary"}`}
                                key="explore"
                                type="button"
                                onClick={this.handleExplore}>
                                Explore
                        </button>

                        <button className={`btn ${this.state.mode === "stop" ?"btn-primary":"btn-secondary"}`}
                                key="stop"
                                type="button"
                                onClick={this.handleStop}>
                                Stop
                        </button>
                    </div>
                </Col>
            </Row>
        
        
        return (
			<Grid fluid={true}>
				<Row>
					<PageHeader>E2T <small>Managin Test Exploration</small></PageHeader>
				</Row>
				{record}			
			</Grid>
        );
    }
}

render(<Popup/>, document.getElementById('app'));
