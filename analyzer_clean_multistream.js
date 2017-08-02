//TODOs (high levels)
//check META READY @ vs VIDEO READY @ timing 

//NEW NEW
//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'generated/video_out.json';
const META_IN_FILE_LIST = 'testfiles';  //format <META_IN_FILE_LIST><DISTRIBUTION>.txt
const DETAILED_ANALYSIS = false; //generate buffer status files (instead of sum of rebuff events) - NOTE: To be used with single files (otherwise results will be overwritten)

//constants
const DEPENDENT = false;
const DELAYED_START = true;    //video stream ignores vbuff_thres and waits for meta-stream to initiate playback //TODOk: test if it works as supposed to
//const META_BEHAVIOUR = 'DROP_FRAMES';   // 'REBUFF'/'DROP_FRAMES': behaviour to follow on meta playback (Video waits, or Meta drops frames)
const DROP_FRAMES = false;  //TODOk: test this (does not seem to work)
//const DISTRIBUTION = ((META_IN_FILE.search('UNIFORM') > 0) ? 'UNIFORM' : 'NORMAL');   //single file not supported here - parsed from the META_IN_FILE_LIST during analysis
const META_BUFFER_PLAY_THRESHOLD_MIN = 100; //in ms
const META_BUFFER_PLAY_THRESHOLD_MAX = 1500; //in ms
const META_BUFFER_PLAY_THRESHOLD_STEP = 100; //in ms

const VIDEO_BUFFER_PLAY_THRES = 1000; //in ms

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
readStreamFiles(normal_files_list, 'NORMAL');
performAnalysis(normal_files_list, normal_res_obj);
readStreamFiles(uniform_files_list, 'UNIFORM');
performAnalysis(uniform_files_list, uniform_res_obj);

//var res_to_file_n = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
//var res_to_file_u = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
var res_to_file_n = resultsToFile(normal_res_obj, 'NORMAL');
var res_to_file_u = resultsToFile(uniform_res_obj, 'UNIFORM');

console.log('All test DONE');



/*
 * STARTOF objects
 */
function Stream(filename, id) {
    this.filename = filename;
    this.frames_FRN_ordered = tl.readJSON(filename).slice(0);
    this.frames_Tarr_ordered = this.frames_FRN_ordered.slice(0);
    bubbleSortArrayByProperty(this.frames_Tarr_ordered, 'T_arrival');
    this.ID = id;
    this.nextFrameIndex = 0;
}

function Buffer(id, type = 'META', Binit = 0) {
    this.frames = [];
    this.size_Continuous = 0;
    this.size_Fragmented = 0;
    this.duration_Continuous = 0;
    this.duration_Fragmented = 0;
    this.ID = id;
    this.changed = false;
    this.status = 'NEW';
    this.type = type
    this.Binit = Binit;
    this.Bplay = 0;


    this.updateStatus = function () {

        if (this.status == 'NEW') {

            if (this.Binit <= (this.frames[this.frames.length - 1].T_display - this.frames[0].T_display)) {   //check if we are on playback levels
                this.status = 'READY';
                console.log(this.type+" "+this.ID+" READY @ " + this.frames.length);    //TODO: replace with time of incoming frame
            }
        } else if (this.status == 'PLAYING') {
            if (this.frames.length == 0) {
                this.status = 'BUFFERING';
                console.log(this.type+" "+this.ID+" BUFFERING @ " + this.frames.length);    //TODO: replace with time of incoming frame
            }
        } else if (this.status == 'BUFFERING') {
            if (this.frames.length > 0) {
                this.status = 'READY';
                console.log(this.type+" "+this.ID+" READY @ " + this.frames.length);    //TODO: replace with time of incoming frame
            }
        }

    }

}




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
    for (var i_t = 0; i_t < files_obj_in.fileslength; i_t++) {
        var files_in = [];
        //build file-in list
        for (var i_x = i_t; i_x < number_of_streams + i_t; i_x++) {
            files_in.push(files_obj_in.files[i_x].File);
        }
        var result = do_analysis(files_in, number_of_streams);
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
    //holder of analysis results
    var analysis_results = [];
    //incoming video frames
    var video_ordered = tl.readJSON(VIDEO_IN_FILE);
    //incoming extra frames
    var dela_ordered = tl.readJSON(file_in).slice(0);
    //frame duration (should be the same for extra and video frames)
    var frame_duration = dela_ordered[1].T_display - dela_ordered[0].T_display;

    //bubbleSortArray(dela_ordered, 4); //sort according to FRN

    /**
     * ENTRY POINT OF THE SIMULATION
     */
    for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
        /**
         * Setup simulation environment for specific sample file
         */
        var METRICS_M = { m_r_events: 0, m_r_duration: 0, m_r_frames: 0, m_i_frames: 0, m_r_first: 0 }; //TODOk: check m_r_first (i.e. FirstRT) - possible averaging error AND time not consistent with StartT
        var dropped_mframes = 0, displayed_mframes = 0;
        var v_t_play = 0, m_t_play = 0, init_t_diff = 0;
        var per_in_sync = 0;    //TODOk: check this (i.e. TimeInSync) - possibly OK
        //for resetting queues
        var dela_list = [];
        var D_min_observed = 999999, D_max_observed = 0, D_mean_observed = -1, D_mean_buffer = -1;

        for (var i_a = 0; i_a < dela_ordered.length; i_a++) {
            var elem = dela_ordered[i_a];
            var item = {};
            item.T_arrival = elem.T_arrival;
            item.T_display = elem.T_display;
            item.FRN = elem.FRN;
            item.contents = -1; //empty
            dela_list.push(item);
        }

        var dela_Tarr_ordered = dela_list.slice(0);
        bubbleSortArrayByProperty(dela_Tarr_ordered, 'T_arrival');

        if (DETAILED_ANALYSIS) {
            tl.write(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + VIDEO_BUFFER_PLAY_THRES + (DEPENDENT ? 'D' : '') + '.txt', 'Time \t vbuffer \t mbuffer (c) \t mbuffer (f) \t mbuffer (c) frames \t mbuffer (f) frames \t MBuff[0]FRN+1 \t VBuff[0]FRN+1 \t MBuff_status');
        }

        var T_zero = video_ordered[0].T_display;    //first vframe timestamp
        var T_end = T_zero + TEST_DURATION;
        var Vbuff = [];
        var incoming_vframe = video_ordered[0];
        var current_vbuff_status = 'NEW';

        var Mbuff = [];
        var Mbuff_f_duration = 0;
        var Mbuff_c_duration = 0;
        var Mbuff_c_size = 0;
        var Mbuff_changed = false;
        var m_index = 0;
        var m_curr_Frame = {};
        var v_curr_Frame = {};
        var m_next_FRN = 0; //next FRN of meta-frame to be played
        var v_next_FRN = 0; //next FRN of vid-frame to be played
        var incoming_mframe = dela_Tarr_ordered[m_index];
        var current_mbuff_status = 'NEW';

        /**
         * Actual simulation start - by iterating through vframes
         */

        for (var v_i = 0; v_i < video_ordered.length; v_i++) {

            if (TEST_DURATION < (incoming_vframe.T_display - video_ordered[0].T_display)) {     //check if exceeded test duration
                //we do not calculate it since it is equal to m_r_duration
                //accumulated_jitter = ((v_curr_Frame.T_display - m_curr_Frame.T_display) -init_t_diff);
                break;
            }



            /**
             * Check arriving vframes and VBuff status
             */
            //select current incoming vframe
            incoming_vframe = video_ordered[v_i];
            //push current incoming vframe in Vbuffer    
            Vbuff.push(video_ordered[v_i]);
            //set buffer status ('NEW', 'READY', 'BUFFERING')
            current_vbuff_status = calculateVBuffStatus(current_vbuff_status, incoming_vframe, Vbuff, VIDEO_BUFFER_PLAY_THRES);


            /**
             * Check arriving mframes and MBuff status
             */
            //select current incoming mframe
            incoming_mframe = dela_Tarr_ordered[m_index];
            //push incoming mframes in MBuffer
            while (incoming_mframe.T_arrival <= incoming_vframe.T_display) {
                Mbuff.push(incoming_mframe);
                m_index++;
                incoming_mframe = dela_Tarr_ordered[m_index];
                Mbuff_changed = true;
            }


            if (DROP_FRAMES && current_vbuff_status == 'PLAYING') {
                while (Mbuff.length > 0 && (Mbuff[0].T_display < (v_curr_Frame.T_display + frame_duration))) {
                    //console.log('Dropped: '+ Mbuff.shift().FRN+'    for'+v_curr_Frame.FRN);
                    Mbuff.shift();
                    dropped_mframes++;
                    Mbuff_changed = true;
                }
                if (Vbuff[0].FRN != 0) {
                    m_next_FRN = Vbuff[0].FRN;
                }
            }


            //Re-sort MBuff
            if (Mbuff_changed && Mbuff.length > 0) {
                bubbleSortArrayByProperty(Mbuff, 'FRN');
                //calculate new fragment MBuff size
                Mbuff_f_duration = (Mbuff[Mbuff.length - 1].T_display - Mbuff[0].T_display);
                if (Mbuff.length > 1) {
                    //calculate new continuous MBuff size
                    Mbuff_c_size = calculateMBuffSize(Mbuff, dela_list, m_next_FRN, Mbuff_c_size);
                    //calculate new continuous MBuff duration
                    Mbuff_c_duration = Mbuff_c_size * frame_duration;
                }
            }

            //previously (for initial playback): if(current_mbuff_status == 'NEW' && Mbuff[0].FRN != 0){
            //if next frame number is not as expected, discard calculated buffer size
            if (Mbuff.length == 0 || Mbuff[0].FRN != m_next_FRN) {
                Mbuff_c_duration = 0;
                Mbuff_c_size = 0;
            }

            Mbuff_changed = false;

            //set buffer status ('NEW', 'READY', 'BUFFERING')
            current_mbuff_status = calculateMBuffStatus(current_mbuff_status, Mbuff, mbuff_thres, Mbuff_c_duration, incoming_vframe, METRICS_M, video_ordered, v_i);



            /**
             * Check if updated buffers (both) should start playback
             */
            if (current_vbuff_status == 'PLAYING' || current_vbuff_status == 'READY') {
                current_vbuff_status = 'PLAYING';
                if (v_t_play == 0) {
                    v_t_play = incoming_vframe.T_display;
                }
            }
            if (current_mbuff_status == 'PLAYING' || current_mbuff_status == 'READY') {
                if (Mbuff[0].T_display <= Vbuff[0].T_display) {
                    if (m_t_play == 0) {
                        m_t_play = incoming_vframe.T_display;
                        init_t_diff = m_t_play - v_t_play;
                    }
                    current_mbuff_status = 'PLAYING';
                    Mbuff_changed = true;
                }
            }

            if (DELAYED_START) {
                if ((current_vbuff_status == 'READY' || current_vbuff_status == 'PLAYING') && current_mbuff_status != 'PLAYING' && Vbuff[0].FRN == 0) {
                    current_vbuff_status = 'READY';
                }
            }

            //removed qeued element
            if (current_vbuff_status == 'PLAYING') {
                if (!DEPENDENT || current_mbuff_status == 'PLAYING') {
                    v_curr_Frame = Vbuff.shift();
                    v_next_FRN = v_curr_Frame.FRN + 1;
                }
            }
            if (current_mbuff_status == 'PLAYING') {
                m_curr_Frame = Mbuff.shift();
                m_next_FRN = m_curr_Frame.FRN + 1;
                Mbuff_changed = true;
                //console.log('Displayed: '+ m_curr_Frame.FRN+'    for'+v_curr_Frame.FRN);
                displayed_mframes++;
            }

            /**
             * mean, min, man - delay estimations (from Mbuffer)
             */
            if (Mbuff.length > 0) {
                //1. FRN-agnostic
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
                //2. FRN-aware
                //Not used - Less accurate
                /*
                if (Mbuff.length > 0) {
 
                    var Dmean = -1;
 
                    if(Mbuff[0].FRN != m_next_FRN){
                        Dmean = -2
                    }else{
                        var dd =0;
                        for(var i =1; i<Mbuff.length; i++){
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
                    '\n' + (incoming_vframe.T_display - T_zero).toFixed(2) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display).toFixed(2) + '\t' + Mbuff_c_duration.toFixed(2) + '\t' + Mbuff_f_duration.toFixed(2) + '\t' + Mbuff_c_size + '\t' + Mbuff.length + '\t' + (m_next_FRN) + '\t' + (v_next_FRN) + '\t' + current_mbuff_status);
            }


        }

        if (METRICS_M.m_r_first == 0) {
            per_in_sync = 1.0;
        } else {
            var clean_duration = (TEST_DURATION - m_t_play);
            per_in_sync = (METRICS_M.m_r_first - m_t_play) / clean_duration;
        }

        analysis_results.push({ 'Mbuffsize': mbuff_thres, 'Events': METRICS_M.m_r_events, 'Frames': METRICS_M.m_r_frames, 'IFrames': METRICS_M.m_i_frames, 'Duration': METRICS_M.m_r_duration, 'EndSize': Mbuff_c_size, 'StartT': m_t_play, 'FirstRT': METRICS_M.m_r_first, 'TimeInSync': per_in_sync, 'Displayed': displayed_mframes, 'Dropped': dropped_mframes });

    }
    return analysis_results;

}


/*----- SPECIFIC FUNCTIONS ---*/
/**
 * Parses the filenames from the list
 * @param {obj} files_obj_in object to store results
 * @param {String} type distribution type ('UNIFORM' or 'NORMAL')
 * 
 */
function readStreamFiles(files_obj_in, type) {
    files_obj_in.files = JSON.parse(tl.read(META_IN_FILE_LIST + type + '.txt'));
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
        runs++;
        for (var i_i = 0; i_i < element.length; i_i++) {
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

/**
 * Calculates status of the video buffer ('NEW', 'READY', 'BUFFERING')
 * @param {String} current_vbuff_status current status of video buffer
 * @param {obj} incoming_vframe most recently "received" video frame (and pushed in the buffer)
 * @param {obj} VBuff the whole video buffer object as is when function is called
 * @param {int} vbuff_thres initial playback threshold of video stream (to compare with buffer)
 * @returns {String} status of the video buffer ('NEW', 'READY', 'BUFFERING')
 */
function calculateVBuffStatus(current_vbuff_status, incoming_vframe, VBuff, vbuff_thres) {

    var cvs = current_vbuff_status;
    var cvf = incoming_vframe;
    var vbf = VBuff;
    var vbt = vbuff_thres;

    if (cvs == 'NEW') {

        if (vbt <= (vbf[vbf.length - 1].T_display - vbf[0].T_display)) {   //check if we are on playback levels
            cvs = 'READY';
            console.log("VIDEO READY @ " + cvf.T_display);
        }
    } else if (cvs == 'PLAYING') {
        if (vbf.length == 0) {
            cvs = 'BUFFERING';
            console.log("VIDEO BUFFERING");
        }
    } else if (cvs == 'BUFFERING') {
        if (vbf.length > 0) {
            cvs = 'READY';
            console.log("VIDEO READY @ " + cvf.T_display);
        }
    }
    return cvs;

}


/**
 * Calculates size of the meta buffer (in continuous frames)
 * @param {obj} Mbuff the whole meta buffer object as is when function is called
 * @param {obj} dela_list list of meta frames (ordered by FRN)
 * @param {int} m_next_FRN expected FRN
 * @param {int} Mbuff_c_size size (in frames) of the meta buffer when calling the function
 * @returns {int} continuous size (in frames) of the meta buffer
 */
function calculateMBuffSize(Mbuff, dela_list, m_next_FRN, Mbuff_c_size) {

    var mbs = Mbuff_c_size;

    if (Mbuff.length > 1) {
        var d_index = 0;
        for (var i_c = 0; i_c < dela_list.length; i_c++) {
            if (dela_list[i_c].FRN == m_next_FRN) {
                d_index = i_c;
                break;
            }
        }

        var b_index = 0;
        mbs = 0;
        while ((b_index < Mbuff.length) && (m_next_FRN == Mbuff[0].FRN) && (dela_list[d_index].FRN == Mbuff[b_index].FRN)) {
            mbs++;
            //Mbuff_c_duration = (Mbuff[b_index].T_display - Mbuff[0].T_display);   //m_next_FRN    //Old way - would show 0 when 1 frame in buffer
            b_index++;
            d_index++;
        }
    }

    return mbs;

}



/**
 * Calculates status of the video buffer ('NEW', 'READY', 'BUFFERING')
 * @param {String} current_vbuff_status current status of video buffer
 * @param {obj} incoming_vframe most recently "received" video frame (and pushed in the buffer)
 * @param {obj} VBuff the whole video buffer object as is when function is called
 * @param {int} vbuff_thres initial playback threshold of video stream (to compare with buffer)
 * @returns {String} status of the video buffer ('NEW', 'READY', 'BUFFERING')
 */
function calculateMBuffStatus(current_mbuff_status, Mbuff, mbuff_thres, Mbuff_c_duration, incoming_vframe, METRICS_M, video_ordered, v_i) {

    var cms = current_mbuff_status;

    if (cms == 'NEW') {
        METRICS_M.m_i_frames++;
        if (mbuff_thres <= Mbuff_c_duration) {   //check if we are on playback levels
            cms = 'READY';
            console.log(mbuff_thres + " META READY @ " + incoming_vframe.T_display)
        }
    } else if (cms == 'PLAYING') {
        if (Mbuff.length == 0 || Mbuff_c_duration == 0) {
            cms = 'BUFFERING';
            if (METRICS_M.m_r_first == 0) {
                METRICS_M.m_r_first = incoming_vframe.T_display;
            }
            METRICS_M.m_r_events++;
            METRICS_M.m_r_frames++;
            console.log("META BUFFERING")
        }
    } else if (cms == 'BUFFERING') {
        METRICS_M.m_r_frames++;
        if (Mbuff_c_duration > 0 && Mbuff.length > 0) {
            cms = 'READY';
            console.log(mbuff_thres + " META READY @ " + incoming_vframe.T_display)
        }
    }
    if (cms == 'BUFFERING') {
        METRICS_M.m_r_duration += (video_ordered[v_i].T_display - video_ordered[v_i - 1].T_display);
    }

    return cms;

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
        for (var i = 0; i < array.length - 1; i++) {
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
        for (var i = 0; i < array.length - 1; i++) {
            if (array[i][property] > array[i + 1][property]) {
                var temp = array[i];
                array[i] = array[i + 1];
                array[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
}