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

// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');

module.exports = {
    // The skill states are the different parts of the skill.
    SKILL_STATES: {
        // Roll Call mode performs roll call and button registration.
        // https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html
        ROLL_CALL_MODE: '',
        PLAY_MODE: '_PLAY_MODE',
        // Exit mode performs the actions described in
        // https://developer.amazon.com/docs/gadget-skills/exit-echo-button-skill.html
        EXIT_MODE: '_EXIT_MODE'
    },

    // We'll use an audio sample of a ticking clock to play whenever the skill is waiting for button presses
    // This is an audio file from the ASK Sound bank: https://developer.amazon.com/docs/custom-skills/foley-sounds.html
    WAITING_AUDIO: '<audio src="https://s3.amazonaws.com/ask-soundlibrary/foley/amzn_sfx_rhythmic_ticking_30s_01.mp3"/>',
    WINNING_AUDIO: '<audio src="https://s3.amazonaws.com/ask-soundlibrary/musical/amzn_sfx_bell_timer_01.mp3"/>',
    LOSING_AUDIO:  '<audio src="https://s3.amazonaws.com/ask-soundlibrary/musical/amzn_sfx_buzzer_small_01.mp3"/>',

    COLOR_SHADES: {
        /* map the 'blue' selection to a set of shades of blue */
        'blue':  ['0000ff', '000077', '000027', '000003'],
        /* map the 'green' selection to a set of shades of green */
        'green': ['00ff00', '007700', '002700', '000300'],
        /* map the 'red' selection to a set of shades of red */
        'red':   ['ff0000', '770000', '270000', '030000']
    },

    // Define animations to be played on button down and button up that are like the default animations on the buttons
    // We'll use these animations when resetting play state
    // See: https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate
    DEFAULT_ANIMATIONS: {
        'ButtonDown' : {
            'targetGadgets': [],
            'animations': BasicAnimations.FadeOutAnimation(1, 'blue', 200)
        },
        'ButtonUp': {                     
            'targetGadgets': [], 
            'animations': BasicAnimations.SolidAnimation(1, 'black', 100)
        }
    }
};