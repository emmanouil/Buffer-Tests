//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'video_out.vid';
const META_IN_FILE = 'meta_out_min200_max3200_distrNORMAL_freq30_0.json'
const META_IN_FILE_LIST = 'testfiles';  //format <META_IN_FILE_LIST><DISTRIBUTION>.txt
const SINGLE_FILE = false;  //if true run META_IN_FILE, else run al META_IN_FILE_LIST
const DETAILED_ANALYSIS = false; //generate buffer status files (instead of sum of rebuff events)


//constants
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
    var files_n = JSON.parse(tl.read(META_IN_FILE_LIST + 'NORMAL.txt'));
    var files_u = JSON.parse(tl.read(META_IN_FILE_LIST + 'UNIFORM.txt'));
    var files_n_length = files_n.length;
    var files_u_length = files_u.length;

    var results_u = [];
    var results_n = [];
    for (var i_t = 0; i_t < files_n_length; i_t++) {
        var result = do_analysis(files_n[i_t].File);
        //        result.Type = 'NORMAL';
        results_n.push(result);
    }
    for (var i_t = 0; i_t < files_u_length; i_t++) {
        var result = do_analysis(files_u[i_t].File);
        //        result.Type = 'UNIFORM';
        results_u.push(result);
    }
    var res_to_file_n = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
    var res_to_file_u = [{ 'Mbuffsize': 0, 'Events': 0, 'Frames': 0, 'Duration': 0 }];
    for (var i_i = META_BUFFER_PLAY_THRESHOLD_MIN; i_i <= META_BUFFER_PLAY_THRESHOLD_MAX; i_i += META_BUFFER_PLAY_THRESHOLD_STEP) {
        res_to_file_n[i_i / META_BUFFER_PLAY_THRESHOLD_STEP] = { 'Mbuffsize': i_i, 'Events': 0, 'Frames': 0, 'Duration': 0 };
        res_to_file_u[i_i / META_BUFFER_PLAY_THRESHOLD_STEP] = { 'Mbuffsize': i_i, 'Events': 0, 'Frames': 0, 'Duration': 0 };
    }

    //Object.assign({},res_to_file_n);
    var runs = 0;
    results_n.forEach(function (element, index, array) {
        runs++;
        for (var i_i = 0; i_i < element.length; i_i++) {
            var a = element[i_i];
            var tmp_index = tl.findIndexByProperty(res_to_file_n, 'Mbuffsize', a.Mbuffsize);
            if (tmp_index > 0) {
                res_to_file_n[tmp_index].Events += a.Events;
                res_to_file_n[tmp_index].Frames += a.Frames;
                res_to_file_n[tmp_index].Duration += a.Duration;
            } else {
                console.log('[ERROR] not found');
            }
        }
    });
    tl.write(NODE_OUT_PATH + RESULTS_FILE + '_' + 'N' + '_analysis_' + runs + '.txt', 'Buffsize \t R.Events \t R.Frames \t R.Duration \n');
    res_to_file_n.forEach(function (elem, index, array) {
        tl.append(NODE_OUT_PATH + RESULTS_FILE + '_' + 'N' + '_analysis_' + runs + '.txt', elem.Mbuffsize + '\t' + elem.Events / runs + '\t' + elem.Frames / runs + '\t' + elem.Duration / runs + '\n');
    });
    console.log('normal runs ' + runs);

    runs = 0;
    results_u.forEach(function (element, index, array) {
        runs++;
        for (var i_i = 0; i_i < element.length; i_i++) {
            var a = element[i_i];
            var tmp_index = tl.findIndexByProperty(res_to_file_u, 'Mbuffsize', a.Mbuffsize);
            if (tmp_index > 0) {
                res_to_file_u[tmp_index].Events += a.Events;
                res_to_file_u[tmp_index].Frames += a.Frames;
                res_to_file_u[tmp_index].Duration += a.Duration;
            } else {
                console.log('[ERROR] not found');
            }
        }
    });
    tl.write(NODE_OUT_PATH + RESULTS_FILE + '_' + 'U' + '_analysis_' + runs + '.txt', 'Buffsize \t R.Events \t R.Frames \t R.Duration \n');
    res_to_file_u.forEach(function (elem, index, array) {
        tl.append(NODE_OUT_PATH + RESULTS_FILE + '_' + 'U' + '_analysis_' + runs + '.txt', elem.Mbuffsize + '\t' + elem.Events / runs + '\t' + elem.Frames / runs + '\t' + elem.Duration / runs + '\n');
    });
    console.log('uniform runs ' + runs);
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


    for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
        for (var vbuff_thres = VIDEO_BUFFER_PLAY_THRESHOLD_MIN; vbuff_thres <= VIDEO_BUFFER_PLAY_THRESHOLD_MAX; vbuff_thres += VIDEO_BUFFER_PLAY_THRESHOLD_STEP) {
            var m_r_events = 0, m_r_duration = 0, m_r_frames = 0;
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
                tl.write(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + '.txt', 'Time \t vbuffer \t mbuffer (c) \t mbuffer (f)');
            }

            T_zero = video_ordered[0].T_display;    //first vframe timestamp
            T_end = T_zero + TEST_DURATION;
            var Vbuff = [];
            var current_vframe = video_ordered[0];
            var current_vbuff_status = 'NEW';

            var Mbuff = [];
            var Mbuff_f_size = 0;
            var Mbuff_size = 0;
            var Mbuff_changed = false;
            var m_index = 0;
            var current_mframe = dela_Tarr_ordered[m_index];
            var current_mbuff_status = 'NEW';

            for (var v_i = 0; v_i < video_ordered.length; v_i++) {   //iterate vframes

                if (TEST_DURATION < (current_vframe.T_display - video_ordered[0].T_display)) {     //check if exceeded test duration
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
                    Mbuff_f_size = (Mbuff[Mbuff.length - 1].T_display - Mbuff[0].T_display);
                    //calculate non-fragmented buffer size
                    if (Mbuff.length > 1) {
                        var d_index = 0;
                        for (var i_c = 0; i_c < dela_list.length; i_c++) {
                            if (dela_list[i_c].FRN == Mbuff[0].FRN) {
                                d_index = i_c;
                                break;
                            }
                        }

                        var b_index = 0;
                        while ((b_index < Mbuff.length) && dela_list[d_index].FRN == Mbuff[b_index].FRN) {
                            Mbuff_size = (Mbuff[b_index].T_display - Mbuff[0].T_display);
                            b_index++;
                            d_index++;
                        }
                    }
                }
                Mbuff_changed = false;

                if (current_mbuff_status == 'NEW') {
                    if (mbuff_thres <= Mbuff_size) {   //check if we are on playback levels
                        if (Mbuff[0].T_display < Vbuff[0].T_display) {
                            Mbuff.shift();
                            Mbuff_changed = true;
                        }
                        current_mbuff_status = 'PLAYING';
                        console.log(DISTRIBUTION + mbuff_thres + " META PLAYING @ " + Vbuff[0].T_display)
                    }
                } else if (current_mbuff_status == 'PLAYING') {
                    if (Mbuff.length == 0 || Mbuff_size == 0) {
                        current_mbuff_status = 'BUFFERING';
                        m_r_events++;
                        m_r_frames++;
                        console.log("META BUFFERING")
                    } else {
                        if (Mbuff[0].T_display < Vbuff[0].T_display) {
                            Mbuff.shift();
                            Mbuff_changed = true;
                        }
                    }
                } else if (current_mbuff_status == 'BUFFERING') {
                    m_r_frames++;
                    if (Mbuff_size > 0) {
                        current_mbuff_status = 'PLAYING';
                        console.log(DISTRIBUTION + mbuff_thres + " META PLAYING @ " + Vbuff[0].T_display)
                    }
                }
                if (current_mbuff_status == 'BUFFERING') {
                    m_r_duration += (video_ordered[v_i].T_display - video_ordered[v_i - 1].T_display);
                }


                //check both buffers if ready for playback
                if(current_vbuff_status == 'PLAYING' || current_vbuff_status == 'READY'){
                    current_vbuff_status = 'PLAYING';
                    Vbuff.shift();
                }

                //removed qeued element
                if(current_vbuff_status == 'PLAYING'){
                    Vbuff.shift();
                }




                if (DETAILED_ANALYSIS) {
                    tl.append(NODE_OUT_PATH + RESULTS_FILE + '_FIXED_' + DISTRIBUTION + '_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + '.txt',
                        '\n' + (current_vframe.T_display - T_zero) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display) + '\t' + Mbuff_size + '\t' + Mbuff_f_size);
                }


            }
            //            tl.append(NODE_OUT_PATH + RESULTS_FILE + '_analysis.txt', mbuff_thres + '\t' + m_r_events + '\t' + m_r_frames + '\t' + m_r_duration + '\n');

            analysis_results.push({ 'Mbuffsize': mbuff_thres, 'Events': m_r_events, 'Frames': m_r_frames, 'Duration': m_r_duration });
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