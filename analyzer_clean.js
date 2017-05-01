//NEW NEW
//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'video_out.vid';
//const META_IN_FILE = 'meta_out_min200_max3200_distrNORMAL_freq30_0.json'
const META_IN_FILE = 'meta_out_min200_max3200_distrNORMAL_freq30_30.json'
const META_IN_FILE_LIST = 'testfiles';  //format <META_IN_FILE_LIST><DISTRIBUTION>.txt
const SINGLE_FILE = false;  //if true run META_IN_FILE, else run al META_IN_FILE_LIST
const DETAILED_ANALYSIS = false; //generate buffer status files (instead of sum of rebuff events) - NOTE: To be used with single files (otherwise results will be overwritten)

//constants
const DEPENDENT = false;
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


    for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
        for (var vbuff_thres = VIDEO_BUFFER_PLAY_THRESHOLD_MIN; vbuff_thres <= VIDEO_BUFFER_PLAY_THRESHOLD_MAX; vbuff_thres += VIDEO_BUFFER_PLAY_THRESHOLD_STEP) {
            var m_r_events = 0, m_r_duration = 0, m_r_frames = 0, m_i_frames = 0;
            var v_t_play = 0, m_t_play = 0, init_t_diff = 0;
            var m_r_first = 0;
            //for resetting queues
            var dela_list = [];

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
            var current_vframe = video_ordered[0];
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
            var current_mframe = dela_Tarr_ordered[m_index];
            var current_mbuff_status = 'NEW';

            for (var v_i = 0; v_i < video_ordered.length; v_i++) {   //iterate vframes

                if (TEST_DURATION < (current_vframe.T_display - video_ordered[0].T_display)) {     //check if exceeded test duration
                    //we do not calculate it sincei it is equal to m_r_duration
                    //accumulated_jitter = ((v_curr_Frame.T_display - m_curr_Frame.T_display) -init_t_diff);
                    break;
                }
                //first do the vframes
                current_vframe = video_ordered[v_i];    //select current vframe
                Vbuff.push(video_ordered[v_i]);     //push current vframe in Vbuffer
                if (current_vbuff_status == 'NEW') {
                    if (vbuff_thres <= (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display)) {   //check if we are on playback levels
                        current_vbuff_status = 'READY';
                        console.log("VIDEO READY")
                    }
                } else if (current_vbuff_status == 'PLAYING') {
                    if (Vbuff.length == 0) {
                        current_vbuff_status = 'BUFFERING';
                        console.log("VIDEO BUFFERING")
                    }
                } else if (current_vbuff_status == 'BUFFERING') {
                    if (Vbuff.length > 0) {
                        current_vbuff_status = 'READY';
                        console.log("VIDEO READY")
                    }
                }


                //then the metaframes
                current_mframe = dela_Tarr_ordered[m_index];    //select current mframe
                while (current_mframe.T_arrival <= current_vframe.T_display) {    //push current mframe in MBuffer
                    Mbuff.push(current_mframe);
                    m_index++;
                    current_mframe = dela_Tarr_ordered[m_index];
                    Mbuff_changed = true;
                }

                if (Mbuff_changed && Mbuff.length > 0) {
                    bubbleSortArrayByProperty(Mbuff, 'FRN');
                    //calculate fragmented buffer size
                    Mbuff_f_duration = (Mbuff[Mbuff.length - 1].T_display - Mbuff[0].T_display);

                    //calculate non-fragmented buffer size
                    if (Mbuff.length > 1) {
                        var d_index = 0;
                        for (var i_c = 0; i_c < dela_list.length; i_c++) {
                            if (dela_list[i_c].FRN == m_next_FRN) {
                                d_index = i_c;
                                break;
                            }
                        }

                        var b_index = 0;
                        Mbuff_c_size = 0;
                        while ((b_index < Mbuff.length) && (m_next_FRN == Mbuff[0].FRN) && (dela_list[d_index].FRN == Mbuff[b_index].FRN)) {
                            Mbuff_c_size++;
                            //                            Mbuff_c_duration = (Mbuff[b_index].T_display - Mbuff[0].T_display);   //m_next_FRN    //Old way - would show 0 when 1 frame in buffer
                            Mbuff_c_duration = Mbuff_c_size * frame_duration;
                            b_index++;
                            d_index++;
                        }
                    }
                }

                //previously (for initial playback): if(current_mbuff_status == 'NEW' && Mbuff[0].FRN != 0){
                //if next frame number is not as expected, discard calculated buffer size
                if (Mbuff.length == 0 || Mbuff[0].FRN != m_next_FRN) {
                    Mbuff_c_duration = 0;
                }

                Mbuff_changed = false;

                if (current_mbuff_status == 'NEW') {
                    m_i_frames++;
                    if (mbuff_thres <= Mbuff_c_duration) {   //check if we are on playback levels
                        current_mbuff_status = 'READY';
                        console.log(DISTRIBUTION + mbuff_thres + " META READY @ " + Vbuff[0].T_display)
                    }
                } else if (current_mbuff_status == 'PLAYING') {
                    if (Mbuff.length == 0 || Mbuff_c_duration == 0) {
                        current_mbuff_status = 'BUFFERING';
                        if (m_r_first == 0) {
                            m_r_first = current_vframe.T_display;
                        }
                        m_r_events++;
                        m_r_frames++;
                        console.log("META BUFFERING")
                    }
                } else if (current_mbuff_status == 'BUFFERING') {
                    m_r_frames++;
                    if (Mbuff_c_duration > 0 && Mbuff.length > 0) {
                        current_mbuff_status = 'READY';
                        console.log(DISTRIBUTION + mbuff_thres + " META PLAYING @ " + Vbuff[0].T_display)
                    }
                }
                if (current_mbuff_status == 'BUFFERING') {
                    m_r_duration += (video_ordered[v_i].T_display - video_ordered[v_i - 1].T_display);
                }


                //check both buffers if ready for playback
                if (current_vbuff_status == 'PLAYING' || current_vbuff_status == 'READY') {
                    current_vbuff_status = 'PLAYING';
                    if (v_t_play == 0) {
                        v_t_play = current_vframe.T_display;
                    }
                }
                if (current_mbuff_status == 'PLAYING' || current_mbuff_status == 'READY') {
                    if (Mbuff[0].T_display <= Vbuff[0].T_display) {
                        if (m_t_play == 0) {
                            m_t_play = current_vframe.T_display;
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




                if (DETAILED_ANALYSIS) {
                    tl.append(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + (DEPENDENT ? 'D' : '') + '.txt',
                        '\n' + (current_vframe.T_display - T_zero).toFixed(2) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display).toFixed(2) + '\t' + Mbuff_c_duration.toFixed(2) + '\t' + Mbuff_f_duration.toFixed(2) + '\t' + Mbuff_c_size + '\t' + Mbuff.length + '\t' + (m_next_FRN) + '\t' + (v_next_FRN) + '\t' + current_mbuff_status);
                }


            }
            //            tl.append(NODE_OUT_PATH + RESULTS_FILE + '_analysis.txt', mbuff_thres + '\t' + m_r_events + '\t' + m_r_frames + '\t' + m_r_duration + '\n');

            analysis_results.push({ 'Mbuffsize': mbuff_thres, 'Events': m_r_events, 'Frames': m_r_frames, 'IFrames': m_i_frames, 'Duration': m_r_duration, 'EndSize': Mbuff_c_size, 'StartT': m_t_play, 'FirstRT': m_r_first });
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
    var res_to_file = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0 }];
    var t;
    if (type == 'NORMAL') { t = 'N' } else if (type == 'UNIFORM') { t = 'U' }
    for (var i_i = META_BUFFER_PLAY_THRESHOLD_MIN; i_i <= META_BUFFER_PLAY_THRESHOLD_MAX; i_i += META_BUFFER_PLAY_THRESHOLD_STEP) {
        res_to_file[i_i / META_BUFFER_PLAY_THRESHOLD_STEP] = { 'Mbuffsize': i_i, 'Events': 0, 'Frames': 0, 'IFrames': 0, 'Duration': 0, 'EndSize': 0, 'StartT': 0, 'FirstRT': 0 };
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
            } else {
                console.log('[ERROR] not found');
            }
        }
    });
    tl.write(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + '.txt', 'Buffsize \t R.Events \t R.Frames \t IR.Frames \t R.Duration \t EndSize \t StartT \t FirstRT \n');
    res_to_file.forEach(function (elem, index, array) {
        tl.append(NODE_OUT_PATH + RESULTS_FILE + '_' + t + '_analysis_' + runs + '.txt', elem.Mbuffsize + '\t' + (elem.Events / runs).toFixed(2) + '\t' + (elem.Frames / runs).toFixed(2) + '\t' + (elem.IFrames / runs).toFixed(2) + '\t' + (elem.Duration / runs).toFixed(2) + '\t' + (elem.EndSize / runs).toFixed(2) + '\t' + (elem.StartT / runs).toFixed(2) + '\t' + (elem.FirstRT / runs).toFixed(2) + '\n');
    });
    console.log(' runs ' + runs);
    return res_to_file;
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