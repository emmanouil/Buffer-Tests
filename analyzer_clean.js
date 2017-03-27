//imports
var tl = require("./tools.js");

//file-out setup
const NODE_OUT_PATH = 'node_out/';
const VIDEO_IN_FILE = 'video_out.vid'
const META_IN_FILE = 'meta_out_norm.mtd'
var date = new Date();
const RESULTS_FILE = date.getHours().toString() + date.getMinutes().toString() + date.getDate().toString() + date.getMonth().toString() + date.getFullYear().toString();

//file-in setup
var coord_files = [], coord_n, sets = [];   //vars used for playlist parsing

//constants
const DISTRIBUTION = 'NORM';
const VIDEO_BUFFER_PLAY_THRESHOLD_MIN = 1000; //in ms
const VIDEO_BUFFER_PLAY_THRESHOLD_MAX = 4000; //in ms
const VIDEO_BUFFER_PLAY_THRESHOLD_STEP = 500; //in ms
const META_BUFFER_PLAY_THRESHOLD_MIN = 1000; //in ms
const META_BUFFER_PLAY_THRESHOLD_MAX = 4000; //in ms
const META_BUFFER_PLAY_THRESHOLD_STEP = 500; //in ms
const TEST_DURATION = 40000; //in ms

//set at check_delays()
var maxObservedDelay = 0, minObservedDelay = 99999;

//other vars
var proj = [], dela = [], dela_ordered = [], video_ordered = [];

//Actual execution entry point
dela = proj = tl.readJSON(META_IN_FILE);
video_ordered = tl.readJSON(VIDEO_IN_FILE);
//bubble sort to delayed coords
dela_ordered = dela.slice(0);
//bubbleSortArray(dela_ordered, 4); //sort according to FRN


//check that everything is as supposed to be (regarding the dataset)
var last_dela_frame = dela_ordered[dela_ordered.length - 1];
var first_dela_frame = dela_ordered[0];

check_delays();

var test_buffer = [];
for (var mbuff_thres = META_BUFFER_PLAY_THRESHOLD_MIN; mbuff_thres <= META_BUFFER_PLAY_THRESHOLD_MAX; mbuff_thres += META_BUFFER_PLAY_THRESHOLD_STEP) {
    for (var vbuff_thres = VIDEO_BUFFER_PLAY_THRESHOLD_MIN; vbuff_thres <= VIDEO_BUFFER_PLAY_THRESHOLD_MAX; vbuff_thres += VIDEO_BUFFER_PLAY_THRESHOLD_STEP) {
        //for resetting queues
        var video_ordered_tmp = video_ordered.slice(0);
        var dela_ordered_tmp = dela_ordered.slice(0);
        var proj_tmp = proj.slice(0);

        var dela_list = [];
        var dela_list_index = 0;
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




        tl.write(NODE_OUT_PATH+RESULTS_FILE + '_FIXED_'+DISTRIBUTION+'_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + '.txt', 'Time \t vbuffer \t mbuffer (c) \t mbuffer (f)');

        T_zero = video_ordered[0].T_display;    //first vframe timestamp
        T_start = 0;    //timestamp of vframe when video starts playback
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

            if (TEST_DURATION < (current_vframe.T_display -video_ordered[0].T_display)) {     //check if exceeded test duration
                break;
            }
            //first do the vframes
            current_vframe = video_ordered[v_i];    //select current vframe
            Vbuff.push(video_ordered[v_i]);     //push current vframe in Vbuffer
            if (current_vbuff_status == 'NEW') {
                if (vbuff_thres <= (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display)) {   //check if we are on playback levels
                    T_start = Vbuff[Vbuff.length - 1].T_display;
                    Vbuff.shift();
                    current_vbuff_status = 'PLAYING';
                    console.log("VIDEO PLAYING")
                }
            } else if (current_vbuff_status == 'PLAYING') {
                if (Vbuff.length == 0) {
                    current_vbuff_status = 'BUFFERING';
                    console.log("VIDEO BUFFERING")
                } else {
                    Vbuff.shift();                  //if we are playing and frame is due, remove from buffer
                }
            } else if (current_vbuff_status == 'BUFFERING') {
                if (Vbuff.length > 0) {
                    current_vbuff_status = 'PLAYING';
                    console.log("VIDEO PLAYING")
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
                    console.log("META PLAYING")
                }
            } else if (current_mbuff_status == 'PLAYING') {
                if (Mbuff.length == 0) {
                    current_mbuff_status = 'BUFFERING';
                    console.log("META BUFFERING")
                } else {
                    if (Mbuff[0].T_display < Vbuff[0].T_display) {
                        Mbuff.shift();
                        Mbuff_changed = true;
                    }
                }
            } else if (current_mbuff_status == 'BUFFERING') {
                if (Mbuff.length > 0) {
                    current_mbuff_status = 'PLAYING';
                    console.log("META PLAYING")
                }
            }

            tl.append(NODE_OUT_PATH+RESULTS_FILE + '_FIXED_'+DISTRIBUTION+'_Mbuff_' + mbuff_thres + '_Vbuff' + vbuff_thres + '.txt',
             '\n' + (current_vframe.T_display - T_zero) + '\t' + (Vbuff[Vbuff.length - 1].T_display - Vbuff[0].T_display) + '\t' + Mbuff_size + '\t' + Mbuff_f_size);

        }

        console.log('test done');
    }

}

console.log('ALL tests done');



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