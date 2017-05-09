//NEW NEW
//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'generated/video_out.json';
//const META_IN_FILE = 'meta_out_min200_max3200_distrNORMAL_freq30_0.json'
const META_IN_FILE = 'meta_out_min200_max3200_distrUNIFORM_freq30_30.json'
const META_IN_FILE_LIST = 'testfiles';  //format <META_IN_FILE_LIST><DISTRIBUTION>.txt
const SINGLE_FILE = false;  //if true run META_IN_FILE, else run al META_IN_FILE_LIST
const DETAILED_ANALYSIS = false; //generate buffer status files (instead of sum of rebuff events) - NOTE: To be used with single files (otherwise results will be overwritten)

//constants
const DEPENDENT = false;
const DEPENDENT_BEHAVIOUR = 'DROP_FRAMES';   // 'REBUFF'/'DROP_FRAMES': behaviour to follow when dependent playback (Video waits, or Meta drops frames)
const DISTRIBUTION = 'NORMAL';
const VIDEO_BUFFER_PLAY_THRESHOLD_MIN = 1000; //in ms
const VIDEO_BUFFER_PLAY_THRESHOLD_MAX = 1000; //in ms
const VIDEO_BUFFER_PLAY_THRESHOLD_STEP = 500; //in ms
const META_BUFFER_PLAY_THRESHOLD_MIN = 100; //in ms
const META_BUFFER_PLAY_THRESHOLD_MAX = 1500; //in ms
const META_BUFFER_PLAY_THRESHOLD_STEP = 100; //in ms

const TEST_DURATION = 40000; //in ms


var date = new Date();
const RESULTS_FILE = date.getHours().toString() + date.getMinutes().toString() + date.getDate().toString() + date.getMonth().toString() + date.getFullYear().toString();

if (!SINGLE_FILE) {
    var ONorm = { files: '', fileslength: '', results: [] };
    var OUni = { files: '', fileslength: '', results: [] };
    performAnalysis(ONorm, 'NORMAL');
    performAnalysis(OUni, 'UNIFORM');

    //var res_to_file_n = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
    //var res_to_file_u = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
    var res_to_file_n = resultsToFile(ONorm, 'NORMAL');
    var res_to_file_u = resultsToFile(OUni, 'UNIFORM');
    console.log('done');


    //tl.append(NODE_OUT_PATH + RESULTS_FILE + '_analysis.txt', mbuff_thres + '\t' + m_r_events + '\t' + m_r_frames + '\t' + m_r_duration + '\n');
} else {
    var results = do_analysis(META_IN_FILE);
}

console.log('All test DONE');



function do_analysis(file_in) {

    var analysis_results = [];

    //set at check_delays()
    var maxObservedDelay = 0, minObservedDelay = 99999;

    //other vars
    var proj = [], dela = [], dela_ordered = [], video_ordered = [];

    //Actual execution entry point
    dela = proj = tl.readJSON(file_in);
    video_ordered = tl.readJSON(VIDEO_IN_FILE);
    //bubble sort to delayed coords
    dela_ordered = dela.slice(0);
    //bubbleSortArray(dela_ordered, 4); //sort according to FRN
    var frame_duration = dela_ordered[1].T_display - dela_ordered[0].T_display;

    /**
     * ENTRY POINT OF THE SIMULATION
     */
    for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
        for (var vbuff_thres = VIDEO_BUFFER_PLAY_THRESHOLD_MIN; vbuff_thres <= VIDEO_BUFFER_PLAY_THRESHOLD_MAX; vbuff_thres += VIDEO_BUFFER_PLAY_THRESHOLD_STEP) {

            /**
             * Setup simulation environment for specific sample file
             */

            var m_r_events = 0, m_r_duration = 0, m_r_frames = 0, m_i_frames = 0;
            var v_t_play = 0, m_t_play = 0, init_t_diff = 0;
            var m_r_first = 0;
            var per_in_sync = 0;
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
                item.inBuffer = false;
                if (i_a < dela_ordered.length - 1) {
                    item.TnextDiff = parseInt(dela_ordered[i_a + 1].T_display - item.T_display);
                    item.FRNnext = parseInt(dela_ordered[i_a + 1].FRN); //in case we have missing frames (i.e. non-consecutive FRNs)
                } else {
                    item.TnextDiff = -1;
                    item.FRNnext = -1;
                }
                dela_list.push(item);
            }

            var dela_Tarr_ordered = dela_list.slice(0);
            bubbleSortArrayByProperty(dela_Tarr_ordered, 'T_arrival');

            if (DETAILED_ANALYSIS) {
                tl.write(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + (DEPENDENT ? 'D' : '') + '.txt', 'Time \t vbuffer \t mbuffer (c) \t mbuffer (f) \t mbuffer (c) frames \t mbuffer (f) frames \t MBuff[0]FRN+1 \t VBuff[0]FRN+1 \t MBuff_status');
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
                    //we do not calculate it sincei it is equal to m_r_duration
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
                current_vbuff_status = calculateVBuffStatus(current_vbuff_status, incoming_vframe, Vbuff, vbuff_thres);


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

                if (current_mbuff_status == 'NEW') {
                    m_i_frames++;
                    if (mbuff_thres <= Mbuff_c_duration) {   //check if we are on playback levels
                        current_mbuff_status = 'READY';
                        console.log(DISTRIBUTION + mbuff_thres + " META READY @ " + incoming_vframe.T_display)
                    }
                } else if (current_mbuff_status == 'PLAYING') {
                    if (Mbuff.length == 0 || Mbuff_c_duration == 0) {
                        current_mbuff_status = 'BUFFERING';
                        if (m_r_first == 0) {
                            m_r_first = incoming_vframe.T_display;
                        }
                        m_r_events++;
                        m_r_frames++;
                        console.log("META BUFFERING")
                    }
                } else if (current_mbuff_status == 'BUFFERING') {
                    m_r_frames++;
                    if (Mbuff_c_duration > 0 && Mbuff.length > 0) {
                        current_mbuff_status = 'READY';
                        console.log(DISTRIBUTION + mbuff_thres + " META READY @ " + incoming_vframe.T_display)
                    }
                }
                if (current_mbuff_status == 'BUFFERING') {
                    m_r_duration += (video_ordered[v_i].T_display - video_ordered[v_i - 1].T_display);
                }


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
                    tl.append(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + (DEPENDENT ? 'D' : '') + '.txt',
                        '\n' + (incoming_vframe.T_display - T_zero).toFixed(2) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display).toFixed(2) + '\t' + Mbuff_c_duration.toFixed(2) + '\t' + Mbuff_f_duration.toFixed(2) + '\t' + Mbuff_c_size + '\t' + Mbuff.length + '\t' + (m_next_FRN) + '\t' + (v_next_FRN) + '\t' + current_mbuff_status);
                }


            }
            //            tl.append(NODE_OUT_PATH + RESULTS_FILE + '_analysis.txt', mbuff_thres + '\t' + m_r_events + '\t' + m_r_frames + '\t' + m_r_duration + '\n');
            if (m_r_first == 0) {
                per_in_sync = 1.0;
            } else {
                var clean_duration = (TEST_DURATION - m_t_play);
                per_in_sync = (m_r_first - m_t_play) / clean_duration;
            }

            analysis_results.push({ 'Mbuffsize': mbuff_thres, 'Events': m_r_events, 'Frames': m_r_frames, 'IFrames': m_i_frames, 'Duration': m_r_duration, 'EndSize': Mbuff_c_size, 'StartT': m_t_play, 'FirstRT': m_r_first, 'TimeInSync': per_in_sync });
        }
    }
    return analysis_results;

}





/*-- helper analysis functions --*/
function check_delays() {
    minObservedDelay = maxObservedDelay = first_dela_frame.Delay;
    for (var i = 0; i < dela_ordered.length; i++) {
        var local_delay = dela_ordered[i].Delay;
        if (minObservedDelay > local_delay) {
            minObservedDelay = local_delay;
        }
        if (maxObservedDelay < local_delay) {
            maxObservedDelay = local_delay;
        }
    }
}



/*----- SPECIFIC FUNCTIONS ---*/
/**
 * Reads the files from the list and performs analysis on the elements (dataset)
 * @param {obj} obj_in object to store results
 * @param {String} type distribution type ('UNIFORM' or 'NORMAL')
 * 
 */
function performAnalysis(obj_in, type) {
    //var ONorm = {files: '', fileslength:'', results: []};
    obj_in.files = JSON.parse(tl.read(META_IN_FILE_LIST + type + '.txt'));
    obj_in.fileslength = obj_in.files.length;

    for (var i_t = 0; i_t < obj_in.fileslength; i_t++) {
        var result = do_analysis(obj_in.files[i_t].File);
        //        result.Type = 'NORMAL';
        obj_in.results.push(result);
    }
}

/**
 * Parses the contents from the object returned from performAnalysis and writes to file
 * @param {obj} obj_in object containing results
 * @param {String} type distribution type ('UNIFORM' or 'NORMAL')
 * @returns {obj} containing fields written to file
 */
function resultsToFile(obj_in, type) {
    //var ONorm = {files: '', fileslength:'', results: []};
    var res_to_file = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0, 'TimeInSync': 0 }];
    var t;
    if (type == 'NORMAL') { t = 'N' } else if (type == 'UNIFORM') { t = 'U' }
    for (var i_i = META_BUFFER_PLAY_THRESHOLD_MIN; i_i <= META_BUFFER_PLAY_THRESHOLD_MAX; i_i += META_BUFFER_PLAY_THRESHOLD_STEP) {
        res_to_file[i_i / META_BUFFER_PLAY_THRESHOLD_STEP] = { 'Mbuffsize': i_i, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0, 'TimeInSync': 0 };
    }

    //Object.assign({},res_to_file_n);
    var runs = 0;
    obj_in.results.forEach(function (element, index, array) {
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
            } else {
                console.log('[ERROR] not found');
            }
        }
    });
    tl.write(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + '.txt', 'Buffsize \t R.Events \t R.Frames \t IR.Frames \t R.Duration \t EndSize \t StartT \t FirstRT \t TimeInSync \n');
    res_to_file.forEach(function (elem, index, array) {
        tl.append(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + '.txt', elem.Mbuffsize + '\t' + (elem.Events / runs).toFixed(2) + '\t' + (elem.Frames / runs).toFixed(2) + '\t' + (elem.IFrames / runs).toFixed(2) + '\t' + (elem.Duration / runs).toFixed(2) + '\t' + (elem.EndSize / runs).toFixed(2) + '\t' + (elem.StartT / runs).toFixed(2) + '\t' + (elem.FirstRT / runs).toFixed(2) + '\t' + (elem.TimeInSync / runs).toFixed(2) + '\n');
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
            //                            Mbuff_c_duration = (Mbuff[b_index].T_display - Mbuff[0].T_display);   //m_next_FRN    //Old way - would show 0 when 1 frame in buffer
            b_index++;
            d_index++;
        }
    }

    return mbs;

}








/*----------- HELPER -----------*/
/**
 * Return the frame with the respective frame no. <frn>
 * @param {int} frn to look up in the delayed frames
 * @returns {Object} returns frame with <frn> number, null if frame not found
 */
function findDelayedByFrameNo(frn) {
    for (var i = 0; i < dela.length; i++) {
        if (dela[i][4][1] == frn)
            return dela[i];
    }
    return null;
}
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