/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

const Alexa = require('ask-sdk-core');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');

/* Set up two new animations:
 *    one animation for winning, and one animation for losing */
const WINNING_ANIMATION = {
       'targetGadgets': [],
       'animations': BasicAnimations.PulseAnimation(3, 'light blue', 'dark green')
    };
const LOSING_ANIMATION = {
       'targetGadgets': [],
       'animations': BasicAnimations.PulseAnimation(3, 'orange', 'red')
    };
    
// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers
function configureRecognizer(gadgetId) {
    return {
        "button_down_recognizer": {
            "type": "match",
            "fuzzy": false,
            "anchor": "end",
            "pattern": [{
                "gadgetIds": [gadgetId],
                "action": "down"
            }]
        }
    };
}

// Define named events based on the DIRECT_BUTTON_DOWN_RECOGNIZER and the built-in "timed out" recognizer
// to report back to the skill when either of the two buttons in play was pressed and eventually when the
// input handler times out
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const DIRECT_MODE_EVENTS = {
    "button_down_event": {
        "meets": ["button_down_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": true
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};


// ***********************************************************************
//   PLAY_MODE Handlers
//     set up handlers for events that are specific to the Play mode
//     after the user registered the buttons - this is the main mode
// ***********************************************************************
const GamePlay = {

    ColorIntentHandler: function(handlerInput) {
        console.log("GamePlay::colorIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;
                   
        const uColor = request.intent.slots.color.value;
        console.log("User color: " + uColor);
        
        if (uColor === undefined || Settings.COLOR_SHADES[uColor] === undefined) {
            ctx.reprompt = ["What color was that? Please pick a valid color!"];
            ctx.outputSpeech = ["Sorry, I didn't get that. " + ctx.reprompt[0]];
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        } else {
            sessionAttributes.ColorChoice = uColor;
            let colorShades = Settings.COLOR_SHADES[uColor];
            let randomShadeIndex = pickRandomIndex(colorShades);
            sessionAttributes.RefColorShade = colorShades[randomShadeIndex];
            console.log("Selected shade: " + sessionAttributes.RefColorShade);

            let deviceIds = sessionAttributes.DeviceIDs;
            deviceIds = deviceIds.slice(-2);

            /* Build Start Input Handler Directive */
            ctx.directives.push(GadgetDirectives.startInputHandler({
                  'timeout': 20000,
                  'recognizers': configureRecognizer(deviceIds[1]),
                  'events': DIRECT_MODE_EVENTS
                } ));

            /* Save Input Handler Request ID */
            sessionAttributes.CurrentInputHandlerID = request.requestId;
            console.log("Current Input Handler ID: " + sessionAttributes.CurrentInputHandlerID);

            /* configure light animation for the reference button */
            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': [ deviceIds[0] ],
                'animations': BasicAnimations.SolidAnimation(1, sessionAttributes.RefColorShade, 20000)
            } ));
            /* configure light animation for the play button */
            ctx.directives.push(GadgetDirectives.setIdleAnimation({
                'targetGadgets': [ deviceIds[1] ],
                'animations': makeRollingAnimation(Settings.COLOR_SHADES[uColor], 1000)
            } ));
            /* for button down, briefly set the color to the reference shade */
            ctx.directives.push(GadgetDirectives.setButtonDownAnimation({
                'targetGadgets': [ deviceIds[1] ],
                'animations': BasicAnimations.SolidAnimation(1, sessionAttributes.RefColorShade, 10)
            } ));
            /* for button up, briefly set the color to the reference shade */
            ctx.directives.push(GadgetDirectives.setButtonUpAnimation({
                'targetGadgets': deviceIds,
                'animations': BasicAnimations.SolidAnimation(1, sessionAttributes.RefColorShade, 10)
            } ));

            ctx.outputSpeech = ["Ok. " + uColor + " it is. "];
            ctx.outputSpeech.push("Try to press your button when the color matches my button. ");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);
            
            ctx.openMicrophone = false;
            return handlerInput.responseBuilder.getResponse();
        }
    },

    HandleTimeout: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::timeout");
        let {attributesManager} = handlerInput;
        let ctx = attributesManager.getRequestAttributes();
        let sessionAttributes = attributesManager.getSessionAttributes();

        // The color the user chose
        const referenceShade = sessionAttributes.RefColorShade;
        ctx.outputSpeech = ["Time is up. Would you like to play again?"];
        ctx.reprompt = ["Say Yes to keep playing, or No to exit"];

        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);
        // play a custom FadeOut animation, based on the user's selected color
        ctx.directives.push(GadgetDirectives.setIdleAnimation({ 
            'targetGadgets': deviceIds, 
            'animations': BasicAnimations.FadeOutAnimation(1, uColor, 2000) 
        }));
        // Reset button animation for skill exit
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));
                
        // Set Skill End flag
        sessionAttributes.expectingEndSkillConfirmation = true;
        sessionAttributes.state = Settings.SKILL_STATES.EXIT_MODE;
                            
        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    },

    HandleButtonPressed: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::button_down_event");
        let {attributesManager} = handlerInput;
        let ctx = attributesManager.getRequestAttributes();
        let sessionAttributes = attributesManager.getSessionAttributes();

        let gameInputEvents = ctx.gameInputEvents;
        let buttonId = gameInputEvents[0].gadgetId;
        let buttonColor = gameInputEvents[0].color;
        const referenceColor = sessionAttributes.RefColorShade;
        const playerWon = (referenceColor.toUpperCase() === buttonColor.toUpperCase());
        ctx.reprompt = ["Say Yes to keep playing, or No to exit"];
        ctx.outputSpeech = [playerWon
                 ? Settings.WINNING_AUDIO
                   + "Colors Match! Great job. Would you like to play again?"
                 : Settings.LOSING_AUDIO
                   + "Close, but the colors don't match. Would you like to try again?"];

        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);

        let idleAnimation = playerWon ? WINNING_ANIMATION : LOSING_ANIMATION;
        ctx.directives.push(GadgetDirectives.setIdleAnimation(
            idleAnimation, {'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));
        // enter the ExitMode and see if the user would like to play again
        sessionAttributes.expectingEndSkillConfirmation = true;
        sessionAttributes.state = Settings.SKILL_STATES.EXIT_MODE;
        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    }
};

module.exports = GamePlay;

/**
 * The makeRollingAnimation function will be used to generate an
 * animation sequence that cycles through all the shades of a color,
 * from first to last then back to first. The animation will be
 * designed to repeat several times so that it lasts about 20 seconds.
 */
function makeRollingAnimation(colorShades, duration) {
    let sequence = [];
    for (let i = 0; i < colorShades.length; i++) {
        sequence.push({
            "durationMs": duration,
            "blend": false,
            "color": colorShades[i]
        });
    }
    for (let i = colorShades.length-2; i > 0; i--) {
        sequence.push({
            "durationMs": duration,
            "blend": false,
            "color": colorShades[i]
        });
    }
    let cycleDuration = sequence.length * duration;
    let cycles = Math.floor(20000 / cycleDuration) + 1;
    return [
      {
        "repeat": cycles,
        "targetLights": ["1"],
        "sequence": sequence
      }
    ];
};
/**
 *  The pickRandomIndex function will be used to select one of
 *  the color shades at random, from the new COLOR_SHADES
 *  color arrays you've just added to settings.js.
 */
function pickRandomIndex(arr) {
    let index = (arr && arr.length) ?
                Math.floor(Math.random() * Math.floor(arr.length)) : 0;
    return index;
};