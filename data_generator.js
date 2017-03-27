var tl = require("./tools.js");

/*--- OPTIONS ---*/
const DIR_OUT = 'generated';                    //all output will be placed in this folder
const DESCRIPTOR_FILENAME = 'data_info.json'    //parameters and info on the generated files
//const NUMBER_OF_STREAMS = 1;                  //excluding the video stream (only one video for now)
const STREAMS_DURATION = 100000                 //length of generated streams (in ms)
const STREAMS_INIT_TIMESTAMP = 0;               //first timestamp of generated streams
const STREAMS_FINAL_TIMESTAMP = STREAMS_INIT_TIMESTAMP + STREAMS_DURATION;

/*--- video ---*/
const V_FILENAME = 'video_out.vid'
const V_FRAMERATE = 1 / 30;
const V_STREAM_ID = 'VID';
/*--- metadata ---*/
const M_FILENAME = 'meta_out.mtd'
const M_FRAMERATE = 1 / 30;
const M_DELAY_MIN = 100;    //(in ms)
const M_DELAY_MAX = 2000;    //(in ms)
const M_STREAM_ID = 'META';
//const M_DELAY_DISTRIBUTION = 'UNIFORM';

//other consts (using in functions)
const EPSILON = Number.EPSILON;
const PI = Math.PI;
const TWO_PI = 2*PI;


//Entry point
var video_out = generate_frames(V_STREAM_ID, V_FRAMERATE, 'NONE');
var meta_out = generate_frames(M_STREAM_ID, M_FRAMERATE, 'UNIFORM');
tl.writeJSON(V_FILENAME, video_out);
tl.writeJSON(M_FILENAME, meta_out);
console.log('done')

/**
 * Returns array with vframes
 * @param {string} stream_id ID for generated stream
 * @param {float} framerate Framerate for generated stream
 * @param {string} distribution Delay distribution type for/if delayed frames
 * @returns {array} Generated stream
 */
function generate_frames(s_id, framerate = (1/30), d_type = 'NONE') {
    var frames_out = [];
    frames_out.TYPE = s_id;
    framerate = framerate*1000;

    var frn_t = 0, t_a = 0, t_d = 0, dt = 0;

    for (var i = STREAMS_INIT_TIMESTAMP; i < STREAMS_FINAL_TIMESTAMP; i += framerate) {
        if(d_type == 'NONE'){
            t_a = t_d = i;
        }else if(d_type == 'UNIFORM'){
            //TODO add distributions
            dt = getRandomIntInclusiveUniform(M_DELAY_MIN, M_DELAY_MAX);
            t_d = i;
            t_a = t_d + dt;
        }else{
            console.log('[WARNING] Unidentified delay type - ignoring delay');
            t_a = t_d = i;
            d_type = 'NONE';
        }
        frames_out.push({ FRN: frn_t, T_display: t_d, T_arrival: t_a, Delay: dt });
        frn_t++;
    }
    return frames_out;
}

/**
 * Adds next frame_number and diff with next frame in stream array
 * @param {array} s_in Stream in to be analyzed
 */
function analyze_stream(s_in) {
    for (var i = 0; i < s_in.length; i++) {
        var item = s_in[i];
        if (i < s_in.length - 1) {
            item.TnextDiff = parseInt(s_in[i + 1].T_display - item.T_display);
            item.FRNnext = parseInt(s_in[i + 1].FRN);
        } else {
            item.TnextDiff = -1;
            item.FRNnext = -1;
        }
    }
}


//Helper functions
//Generate rand between min and max (Uniform Distribution) (from MDN)
function getRandomIntInclusiveUniform(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Generate rand with mu and sigma (GausianNoise - Normal Distribution) (ref: https://en.wikipedia.org/wiki/Box-Muller_transform)
function getRandomIntInclusiveNormal(mu, sigma){
    var z0, z1, u1, u2;
    do{
        u1 = Math.random() * (1.0 / 1.0);
        u2 = Math.random() * (1.0 / 1.0);
    }
    while(u1 <= EPSILON);

    z0 = Math.sqrt(2.0 * Math.log(u1)) * Math.cos(TWO_PI * u2);
    z0 = Math.sqrt(2.0 * Math.log(u1)) * Math.sin(TWO_PI * u2);
    return z0 * sigma + mu;
}