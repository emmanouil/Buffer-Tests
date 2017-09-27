//TODOs (high levels)
//check META READY @ vs VIDEO READY @ timing

//NEW NEW
//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'generated/video_out.json';
const META_IN_FILE_LIST = 'testfiles';  //format <META_IN_FILE_LIST><DISTRIBUTION>_<MIN_DELAY>-<MAX_DELAY>.txt (automatically check for NORMAL and UNIFORM)
const DELAY_MIN = 200;    //(in ms)
const DELAY_MAX = 3200;    //(in ms)
const DETAILED_ANALYSIS = false; //generate buffer status files (instead of sum of rebuff events) - NOTE: To be used with single files (otherwise results will be overwritten)

//constants
const DROP_FRAMES = false;  //not used
//const DISTRIBUTION = ((META_IN_FILE.search('UNIFORM') > 0) ? 'UNIFORM' : 'NORMAL');
const META_BUFFER_PLAY_THRESHOLD_MIN = 100; //in ms
const META_BUFFER_PLAY_THRESHOLD_MAX = 1500; //in ms
const META_BUFFER_PLAY_THRESHOLD_STEP = 100; //in ms

const VIDEO_BUFFER_PLAY_THRES = 0; //in ms
const NUMBER_OF_STREAMS = 1;    //number of metadata streams (+a 0-delay video stream used as reference)

const TEST_DURATION = 40000; //in ms


//set filename
var date = new Date();
const RESULTS_FILE = date.getHours().toString() + date.getMinutes().toString() + date.getDate().toString() + date.getMonth().toString() + date.getFullYear().toString();




//ENTRY POINT - MAIN


var normal_files_list = { files: '', fileslength: '' };
var normal_res_obj = { results: [] };
var uniform_files_list = { files: '', fileslength: '' };
var uniform_res_obj = { results: [] };
//TODO split file parsing with results
readStreamFiles(normal_files_list, 'NORMAL', DELAY_MIN, DELAY_MAX);
performAnalysis(normal_files_list, normal_res_obj, NUMBER_OF_STREAMS);
readStreamFiles(uniform_files_list, 'UNIFORM', DELAY_MIN, DELAY_MAX);
performAnalysis(uniform_files_list, uniform_res_obj, NUMBER_OF_STREAMS);

//var res_to_file_n = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
//var res_to_file_u = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
var res_to_file_n = resultsToFile(normal_res_obj, 'NORMAL');
var res_to_file_u = resultsToFile(uniform_res_obj, 'UNIFORM');

console.log('All test DONE');



/*
 * STARTOF objects Stream, Buffer, Simulation, Metrics
 */
function Stream(filename, id) {
    this.filename = filename;
    this.frames_FRN_ordered = tl.readJSON(filename).slice(0);
    this.frames_Tarr_ordered = this.frames_FRN_ordered.slice(0);
    bubbleSortArrayByProperty(this.frames_Tarr_ordered, 'T_arrival');
    this.ID = id;
    this.frame_duration = this.frames_FRN_ordered[1].T_display - this.frames_FRN_ordered[0].T_display;
    this.nextFrameIndex = 0;    //holds index of next frame to arrive on frames_Tarr_ordered - reset on new simulation
}

function Buffer(id, stream, type = 'META', Binit = 0) {
    this.frames = [];
    this.size_Continuous = 0;
    this.size_Fragmented = 0;
    this.duration_Continuous = 0;
    this.duration_Fragmented = 0;
    this.ID = id;
    this.changed = false;
    this.status = 'NEW';
    this.type = type;
    this.Binit = Binit;
    this.Bplay = 0;
    this.stream = stream;

    this.receiveFrames = function (timeNow) {
        var incoming_frame;
        var i = 0;
        for (i = this.stream.nextFrameIndex; i < this.stream.frames_Tarr_ordered.length; i += 1) {
            incoming_frame = this.stream.frames_Tarr_ordered[i];
            if (incoming_frame.T_arrival <= timeNow) {
                this.push(incoming_frame);
            } else {
                this.stream.nextFrameIndex = i;
                break;
            }
        }
    };

    this.push = function (frame) {
        this.frames.push(frame);
        this.changed = true;
    };

    /**
     * removes and returns first element in buffer
     */
    this.pop = function () {
        this.changed = true;
        return this.frames.shift();
    };

    this.updateFrames = function (s) {
        if (this.changed && this.frames.length > 0) {
            bubbleSortArrayByProperty(this.frames, 'FRN');
            this.size_Fragmented = this.frames.length;    //we use length instead
            this.duration_Fragmented = this.size_Fragmented * this.stream.frame_duration;
            this.calculateSizeContinuous(s);
            this.changed = false;
        }
    };

    this.calculateSizeContinuous = function (s) {
        if (this.frames.length > 0) {
            if (this.frames[0].FRN != s.m_next_FRN) {
                this.size_Continuous = 0;
            } else {
                var sz = 0;
                var nfrn = s.m_next_FRN;
                var i;
                for (i = 0; i < this.frames.length; i += 1) {
                    if (nfrn == this.frames[i].FRN) {
                        sz += 1;
                        nfrn += 1;
                    } else {
                        break;
                    }
                }
                this.size_Continuous = sz;
            }
        } else {
            this.size_Continuous = 0;
        }

        this.duration_Continuous = this.size_Continuous * this.stream.frame_duration;
    };

    this.updateStatus = function (m) {
        if (this.type == 'VIDEO') {
            if (this.status == 'NEW') {
                if (this.Binit <= (this.frames[this.frames.length - 1].T_display - this.frames[0].T_display)) {   //check if we are on playback levels
                    this.status = 'READY';
                    //console.log(this.type + " " + this.ID + " READY @ " + incoming_vframe.T_display);
                }
            } else if (this.status == 'PLAYING') {
                if (this.frames.length == 0) {  //we assume no out-of-order frames for video
                    this.status = 'BUFFERING';
                    console.log(this.type + " " + this.ID + " BUFFERING @ " + this.simulation.incoming_vframe.T_display);
                }
            } else if (this.status == 'BUFFERING') {
                if (this.frames.length > 0) {
                    this.status = 'READY';
                    console.log(this.type + " " + this.ID + " READY @ " + this.simulation.incoming_vframe.T_display);
                }
            }
        }
        else if (this.type == 'META') {

            var cms = this.status;

            if (cms == 'NEW') {
                m.m_i_frames += 1;
                if (this.Binit <= this.duration_Continuous) {   //check if we are on playback levels
                    cms = 'READY';
                    console.log(this.Binit + " META READY @ " + m.simulation.incoming_vframe.T_display);
                }
            } else if (cms == 'PLAYING') {
                if (this.frames.length == 0 || this.size_Continuous == 0) {
                    cms = 'BUFFERING';
                    if (m.m_r_first == 0) {
                        m.m_r_first = m.simulation.incoming_vframe.T_display;
                    }
                    m.m_r_events += 1;
                    m.m_r_frames += 1;
                    console.log("META BUFFERING");
                }
            } else if (cms == 'BUFFERING') {
                m.m_r_frames += 1;
                if (this.duration_Continuous > this.Bplay && this.frames.length > 0) {
                    cms = 'READY';
                    console.log(this.Binit + " META READY @ " + m.simulation.incoming_vframe.T_display);
                }
            }
            if (cms == 'BUFFERING') {
                m.m_r_duration += (m.simulation.incoming_vframe.T_display - (m.simulation.incoming_vframe.T_display - this.stream.frame_duration));
            }
            this.status = cms;
        } else {
            console.error('UNKNOWN BUFFER TYPE');
        }

    };
}

function Metrics() {
    //TODOk: check m_r_first (i.e. FirstRT) - possible averaging error AND time not consistent with StartT
    this.simulation = {};   //reference to the current simulation
    this.m_r_events = 0;    //rebuffer events (does not include initial buffering)
    this.m_r_duration = 0;  //rebuffer duration (in ms - does not include initial buffering)
    this.m_r_frames = 0;    //rebuffer frames (does not include initial buffering)
    this.m_i_frames = 0;    //initial buffering frames (NOTE: used to calculate initial buffering duration ONLY) - NOT actual frames (TODO: clarify)
    this.m_r_first = 0;     //time (in ms) of first rebuffering occurance (since playback started)
    this.m_dropped_frames = 0;  //not used (not implemented get/set)
    this.m_displayed_frames = 0;
    this.v_play_time = 0;   //initial (video) playback time logging
    this.m_play_time = 0;   //initial (meta) playback time logging
}

Metrics.prototype = {
    get simulation() {
        return this.simulation;
    },
    set simulation(simulation) {
        this.simulation = simulation;
    },
    get m_r_events() {
        return this.m_r_events;
    },
    set m_r_events(num) {
        this.m_r_events = num;
    },
    get m_r_duration() {
        return this.m_r_duration;
    },
    set m_r_duration(num) {
        this.m_r_duration = num;
    },
    get m_r_frames() {
        return this.m_r_frames;
    },
    set m_r_frames(num) {
        this.m_r_frames = num;
    },
    get m_i_frames() {
        return this.m_i_frames;
    },
    set m_i_frames(num) {
        this.m_i_frames = num;
    },
    get m_r_first() {
        return this.m_r_first;
    },
    set m_r_first(num) {
        this.m_r_first = num;
    },
    get m_dropped_frames() {
        return this.m_dropped_frames;
    },
    set m_dropped_frames(num) {
        this.m_dropped_frames = num;
    },
    get m_displayed_frames() {
        return this.m_displayed_frames;
    },
    set m_displayed_frames(num) {
        this.m_displayed_frames = num;
    },
    get v_play_time() {
        return this.v_play_time;
    },
    set v_play_time(num) {
        this.v_play_time = num;
    },
    get m_play_time() {
        return this.m_play_time;
    },
    set m_play_time(num) {
        this.m_play_time = num;
    }
};


function Simulation() {
    this.playStatus = 'INITIALIZING'    //'INITIALIZING', 'PLAYING', 'BUFFERING'
    this.incoming_vframe = {};
    this.m_next_FRN = 0;    //will have to be adjusted for multiple buffers (or use v_next)FRN instead
    this.v_next_FRN = 0;    //only used for logging for now
}

Simulation.prototype = {
    get incoming_vframe() {
        return this.incoming_vframe;
    },
    set incoming_vframe(vframe) {
        this.incoming_vframe = vframe;
    },
    get m_next_FRN() {
        return this.m_next_FRN;
    },
    set m_next_FRN(frn) {
        this.m_next_FRN = frn;
    },
    get v_next_FRN() {
        return this.v_next_FRN;
    },
    set v_next_FRN(frn) {
        this.v_next_FRN = frn;
    },
};


/*
 * STARTOF functions
 */

/**
 * Reads the files from the list and performs analysis on the elements (dataset)
 * @param {obj} files_obj_in object to store results
 * @param {obj} res_obj_out object to store results
 * @param {int} number_of_streams number of incoming metadata streams to simulate (always keeping 0-delay video as reference)
 * 
 */
function performAnalysis(files_obj_in, res_obj_out, number_of_streams = 1) {
    var i_t;
    var i_x;
    var files_in = [];
    var result;
    for (i_t = 0; i_t < files_obj_in.fileslength; i_t += 1) {
        files_in = [];
        //build file-in list
        for (i_x = i_t; i_x < number_of_streams + i_t; i_x += 1) {
            files_in.push(files_obj_in.files[i_x].File);
        }
        result = do_analysis(files_in, number_of_streams);
        res_obj_out.results.push(result);
    }
}

/**
 * 
 * @param {list} filenames_in filenames of metadata files
 * @param {int} number_of_streams number of streams/buffers to simulate
 */
function do_analysis(filenames_in, number_of_streams) {

    //Variables
    //holder of simulated streams
    var streams = [];
    //holder of analysis results
    var analysis_results = [];
    //incoming video frames
    var video_stream = (new Stream((VIDEO_IN_FILE), -1));
    //incoming extra frames
    for (var i = 0; i < number_of_streams; i += 1) {
        streams.push(new Stream((filenames_in[i]), i));
    }
    //TODO check frame duration located in Stream (should be the same for extra and video frames)

    //bubbleSortArray(dela_ordered, 4); //sort according to FRN

    /**
     * ENTRY POINT OF THE SIMULATION
     */
    for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
        //holder of simulated buffers
        var buffers = [];
        //TODO reset Stream objects
        for (var i = 0; i < number_of_streams; i += 1) {
            streams[i].nextFrameIndex = 0;
        }

        /**
         * Setup simulation environment for specific sample file
         */
        var m = new Metrics();
        var s = new Simulation();
        m.simulation = s;
        var per_in_sync = 0;    //TODOk: check this (i.e. TimeInSync) - possibly OK

        if (DETAILED_ANALYSIS) {
            tl.write(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + VIDEO_BUFFER_PLAY_THRES + (DEPENDENT ? 'D' : '') + '.txt', 'Time \t vbuffer \t mbuffer (c) \t mbuffer (f) \t mbuffer (c) frames \t mbuffer (f) frames \t MBuff[0]FRN+1 \t VBuff[0]FRN+1 \t MBuff_status');
        }

        var T_zero = video_stream.frames_Tarr_ordered[0].T_display;    //first vframe timestamp
        var T_end = T_zero + TEST_DURATION;

        var VBuff = new Buffer(-1, video_stream, 'VIDEO', VIDEO_BUFFER_PLAY_THRES);
        s.incoming_vframe = video_stream.frames_Tarr_ordered[0];

        for (var i = 0; i < number_of_streams; i += 1) {
            buffers.push(new Buffer(i, streams[i], 'META', mbuff_thres));
        }


        /**
         * Actual simulation start - by iterating through vframes
         */
        for (var v_i = 0; v_i < video_stream.frames_Tarr_ordered.length; v_i += 1) {

            if (TEST_DURATION < (s.incoming_vframe.T_display - video_stream.frames_Tarr_ordered[0].T_display)) {     //check if exceeded test duration
                //we do not calculate accumulated_jitter since it equals to m_r_duration
                break;
            }



            /**
             * Check arriving vframes and VBuff status
             */
            //select current incoming vframe
            s.incoming_vframe = video_stream.frames_Tarr_ordered[v_i];
            //push current incoming vframe in Vbuffer    
            VBuff.push(video_stream.frames_Tarr_ordered[v_i]);
            //set buffer status ('NEW', 'READY', 'BUFFERING')
            VBuff.updateStatus(m);


            /**
             * Check arriving mframes and MBuff status
             */
            //select current incoming mframe
            for (var i = 0; i < number_of_streams; i += 1) {
                buffers[i].receiveFrames(s.incoming_vframe.T_display)
                //TODO check if buffer status and stream next frame is changed on push
            }

            for (var i = 0; i < number_of_streams; i += 1) {
                //re-sort frames in buffer and update sizes
                buffers[i].updateFrames(s);
                //TODO check if buffer status and stream next frame is changed on push
                //set buffer status ('NEW', 'READY', 'BUFFERING')
                buffers[i].updateStatus(m);
            }

            //STARTOF Playback conditions check
            /**
             * Check if updated buffers (both) could start playback
             */
            var metaBuffersReady = true;
            for (var i = 0; i < number_of_streams; i += 1) {
                //check if all buffers are ready to play
                if (buffers[i].status == 'NEW' || buffers[i].status == 'BUFFERING') {
                    metaBuffersReady = false;
                    break;
                }
            }

            if (metaBuffersReady && ((VBuff.status == 'PLAYING') || (VBuff.status == 'READY'))) {
                VBuff.status = 'PLAYING';
                for (var i = 0; i < number_of_streams; i += 1) {
                    buffers[i].status = 'PLAYING';
                }
            } else {
                //VBuff is ready/playing but mbuffs are buffering
                VBuff.status = 'READY';
            }
            //ENDOF


            //STARTOF logging times
            if (VBuff.status == 'PLAYING') {
                if (m.v_play_time == 0) {
                    m.v_play_time = VBuff.frames[VBuff.frames.length - 1].T_display;
                }
            }

            if (m.m_play_time == 0 && buffers[0].status == 'PLAYING') {
                m.m_play_time = s.incoming_vframe.T_display;
            }
            //ENDOF


            //STARTOF emptying qeues

            if (VBuff.status == 'PLAYING') {
                s.v_next_FRN = VBuff.pop().FRN + 1;
            }
            if (buffers[0].status == 'PLAYING') {
                for (var i = 0; i < number_of_streams; i += 1) {
                    s.m_next_FRN = buffers[i].pop().FRN + 1;
                    m.m_displayed_frames += 1;
                }
            }

            //ENDOF

            /**
             * mean, min, man - delay estimations (from Mbuffer)
             */
            if (buffers[0].frames.length > 0) {
                //1. FRN-agnostic
                /*
                //TODO might need the estimations
                if (Mbuff.length > 0) {
                    var dd = 0;
                    Mbuff.forEach(function (element) {
                        var elemD = element.T_arrival - element.T_display;
                        dd += elemD;
                        D_max_observed = D_max_observed > elemD ? D_max_observed : elemD;
                        D_min_observed = D_min_observed < elemD ? D_min_observed : elemD;
                    }, this);
                    D_mean_buffer = dd / Mbuff.length;
                    //console.log(current_vframe.T_display + ' DM 1 : ' + D_mean_buffer.toFixed(2) + '  min: ' + D_min_observed.toFixed(2) + ' max: ' + D_max_observed.toFixed(2));
                }
                */
                //2. FRN-aware
                //Not used - Less accurate
                /*
                if (Mbuff.length > 0) {
 
                    var Dmean = -1;
 
                    if(Mbuff[0].FRN != m_next_FRN){
                        Dmean = -2
                    }else{
                        var dd =0;
                        for(var i =1; i<Mbuff.length; i+=1){
                            var element = Mbuff[i];
                            if(element.FRN == Mbuff[i-1].FRN+1){
                                dd += element.T_arrival - element.T_display;
                            }else{
                                Dmean = dd/i;
                                break;
                            }
                        }
                    }
                }
                */
            }



            if (DETAILED_ANALYSIS) {
                tl.append(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + VIDEO_BUFFER_PLAY_THRES + (DEPENDENT ? 'D' : '') + '.txt',
                    '\n' + (s.incoming_vframe.T_display - T_zero).toFixed(2) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display).toFixed(2) + '\t' + Mbuff_c_duration.toFixed(2) + '\t' + Mbuff_f_duration.toFixed(2) + '\t' + Mbuff_c_size + '\t' + Mbuff.length + '\t' + (s.m_next_FRN) + '\t' + (s.v_next_FRN) + '\t' + buffers[0].status);
            }


        }

        if (m.m_r_first == 0) {
            per_in_sync = 1.0;
        } else {
            var clean_duration = (TEST_DURATION - m.m_play_time);
            per_in_sync = (m.m_r_first - m.m_play_time) / clean_duration;
        }

        analysis_results.push({ 'Mbuffsize': buffers[0].Binit, 'Events': m.m_r_events, 'Frames': m.m_r_frames, 'IFrames': m.m_i_frames, 'Duration': m.m_r_duration, 'EndSize': buffers[0].size_Continuous, 'StartT': m.m_play_time, 'FirstRT': m.m_r_first, 'TimeInSync': per_in_sync, 'Displayed': m.m_displayed_frames, 'Dropped': m.m_dropped_frames });

    }
    return analysis_results;

}


/*----- SPECIFIC FUNCTIONS ---*/

function startPlayback(video_buffer, meta_buffers) {
    var res = true;
    if (!video_buffer.status == 'READY' || !video_buffer.status == 'PLAYING') {
        return res = false;
    } else {
        for (buffer in meta_buffers) {
            if (!buffer.status == 'READY' || !buffer.status == 'PLAYING') {
                return res = false;
            }
        }
    }
    return res = true;
}

/**
 * Parses the filenames from the list
 * (if d_min && d_max not defined or d_min && d_max == 0 -> revert to old file naming)
 * @param {obj} files_obj_in object to store results
 * @param {String} type distribution type ('UNIFORM' or 'NORMAL')
 * @param {int} d_min minimum delay
 * @param {int} d_max maximum delay 
 * 
 */
function readStreamFiles(files_obj_in, type, d_min = 0, d_max = 0) {
    if (d_min == d_max && (d_min == 0)) {
        files_obj_in.files = JSON.parse(tl.read(META_IN_FILE_LIST + type + '.txt'));
    } else {
        files_obj_in.files = JSON.parse(tl.read(META_IN_FILE_LIST + type + '_' + d_min + '-' + d_max + '.txt'));
    }
    files_obj_in.fileslength = files_obj_in.files.length;
}


/**
 * Parses the contents from the object returned from performAnalysis and writes to file
 * @param {obj} res_obj_in object containing results
 * @param {String} type distribution type ('UNIFORM' or 'NORMAL')
 * @returns {obj} containing fields written to file
 */
function resultsToFile(res_obj_in, type) {
    var res_to_file = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0, 'TimeInSync': 0, 'Displayed': 0, 'Dropped': 0 }];
    var t;
    if (type == 'NORMAL') { t = 'N' } else if (type == 'UNIFORM') { t = 'U' }
    for (var i_i = META_BUFFER_PLAY_THRESHOLD_MIN; i_i <= META_BUFFER_PLAY_THRESHOLD_MAX; i_i += META_BUFFER_PLAY_THRESHOLD_STEP) {
        res_to_file[i_i / META_BUFFER_PLAY_THRESHOLD_STEP] = { 'Mbuffsize': i_i, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0, 'TimeInSync': 0, 'Displayed': 0, 'Dropped': 0 };
    }

    //Object.assign({},res_to_file_n);
    var runs = 0;
    res_obj_in.results.forEach(function (element, index, array) {
        runs += 1;
        for (var i_i = 0; i_i < element.length; i_i += 1) {
            var a = element[i_i];
            var tmp_index = tl.findIndexByProperty(res_to_file, 'Mbuffsize', a.Mbuffsize);
            if (tmp_index > 0) {
                res_to_file[tmp_index].Events += a.Events;
                res_to_file[tmp_index].Frames += a.Frames;
                res_to_file[tmp_index].IFrames += a.IFrames;
                res_to_file[tmp_index].Duration += a.Duration;
                res_to_file[tmp_index].EndSize += a.EndSize;
                res_to_file[tmp_index].StartT += a.StartT;
                res_to_file[tmp_index].FirstRT += a.FirstRT;
                res_to_file[tmp_index].TimeInSync += a.TimeInSync;
                res_to_file[tmp_index].Displayed += a.Displayed;
                res_to_file[tmp_index].Dropped += a.Dropped;
            } else {
                console.log('[ERROR] not found');
            }
        }
    });
    tl.write(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + (DROP_FRAMES ? '_DROP' : '') + '.txt', 'Buffsize \t R.Events \t R.Frames \t IR.Frames \t R.Duration \t EndSize \t StartT \t FirstRT \t TimeInSync \t Displayed \t Dropped \n');
    res_to_file.forEach(function (elem, index, array) {
        tl.append(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + (DROP_FRAMES ? '_DROP' : '') + '.txt', elem.Mbuffsize + '\t' + (elem.Events / runs).toFixed(2) + '\t' + (elem.Frames / runs).toFixed(2) + '\t' + (elem.IFrames / runs).toFixed(2) + '\t' + (elem.Duration / runs).toFixed(2) + '\t' + (elem.EndSize / runs).toFixed(2) + '\t' + (elem.StartT / runs).toFixed(2) + '\t' + (elem.FirstRT / runs).toFixed(2) + '\t' + (elem.TimeInSync / runs).toFixed(2) + '\t' + (elem.Displayed / runs).toFixed(2) + '\t' + (elem.Dropped / runs).toFixed(2) + '\n');
    });
    console.log(' runs ' + runs);
    return res_to_file;
}





/*----------- HELPER -----------*/

/**
 * Sorts <array> according to <index>
 * @param {Array} array to be sorted
 * @param {Integer} index according to which be sorted
 */
function bubbleSortArray(array, index) {
    var swapped;
    if (typeof (array.sorted) != 'undefined')
        array.sorted = true;

    do {
        swapped = false;
        for (var i = 0; i < array.length - 1; i += 1) {
            if (array[i][index] > array[i + 1][index]) {
                var temp = array[i];
                array[i] = array[i + 1];
                array[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
}

/**
 * Sorts <array> according to property
 * @param {Array} array to be sorted
 * @param {String} property according to which be sorted
 */
function bubbleSortArrayByProperty(array, property) {
    var swapped;
    if (typeof (array.sorted) != 'undefined')
        array.sorted = true;

    do {
        swapped = false;
        for (var i = 0; i < array.length - 1; i += 1) {
            if (array[i][property] > array[i + 1][property]) {
                var temp = array[i];
                array[i] = array[i + 1];
                array[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
}