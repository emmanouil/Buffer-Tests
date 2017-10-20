# Buffer-Tests

## File descriptions
### data set
`data_generator.js` nodejs script for generating data set (js)
### simulations
`analyzer_clean_multistream.js` nodejs script for running simulations (js)
`analyzer_clean.js` nodejs script for running simulations (js) [old version]
### graphs
`plot_analysis.py` python script plots analysis data w/ rebuffering events
`plot_analysis_drops.py` python script plots analysis data w/ drop frames
`plot_analysis_drops_multistream.py` python script plots analysis data w/ drop frames [frou graphs per plot]
`plot_detailed_analysis.py` python script plots single-run results (a.k.a. detailed analysis)
`plot_sample_delays.py` python script plots distribution of data set
### other
`tools.js` function used in nodejs scripts


## TODO

### Technical

 * Split plotter in multiple files - per function
   * multigraph and single-graph
   * drops and rebuffs

### Analysis

 * Emphasize on deltas that can be considered RT


## Files


### data_generator
Create files containing sample Video and Meta frames.

#### OPTIONS:
##### GENERAL 
* **DIR_OUT** generated files folder
* **FILE_EXTENTION** 
* **STREAMS_DURATION** in ms
* **STREAMS_INIT_TIMESTAMP**
##### PER-STREAM
* **V/M_FILENAME** naming pattern
* **V/M_FREQ** frame frequency (default: `30`)
* **V/M_STREAM_ID** tag for identifying the frame type (default: `VID` and `META`)
##### META-STREAM ONLY
* **M_DELAY_DISTR** *NONE, UNIFORM, NORMAL*
* **M_DELAY_MIN/MAX**
* **M_DELAY_MEAN** * μ (mu), used for NORMAL distribution *
* **M_DELAY_SD** * σ (sigm), used for NORMAL distribution *

#### OUTPUT:
Files containing json objects for each frame as the following example:
```
{
  "FRN":0,
  "T_display":0,
  "T_arrival":1158.6391326443381,
  "Delay":1158.6391326443381
}
```


### analyzer_clean / analyzer_clean_multistream
Performs the actual simulation - analyzes file(s) containing frames

#### OPTIONS:
##### GENERAL 
* **NODE_OUT_PATH** generated files folder (a.k.a. analyzer in foder)
* **VIDEO_IN_FILE**
* **META_IN_FILE** name of file (w/ extension) containing samples. Used in single-file analysis __only__
* **META_IN_FILE_LIST** name of file (w/o extension - assuming `<filename>`DISTRIBUTION.txt) containing json Objects with relevant files. Example filename `testfiles` for `testfilesUNIFORM.txt` and `testfilesNORMAL.txt`. Example entry of file:
```
{
  "File":"generated/meta_out_min200_max3200_distrNORMAL_freq30_0.json",
  "MinDelay":200,
  "MaxDelay":3200,
  "Distribution":"NORMAL",
  "ID":0
}
```
* **SINGLE_FILE** _bool_ whether it is going to be an analysis of a single file or multiple 
* **DETAILED_ANALYSIS** generate buffer status files (instead of sum of rebuff events) - NOTE: To be used with single files (otherwise results will be overwritten)
* **DEPENDENT** _bool_ whether the Video rebuffers on Meta rebuff
* **META/VIDEO_BUFFER_PLAY_THRESHOLD_MIN/MAX/STEP** (in ms) Inial Buffer playback threshold (starts from min and goes to max, via step inclemental). a.k.a. number of analyses to perform
* **TEST_DURATION** simulation stop time 

#### OUTPUT:
##### Detailed Analysis (Single File)
File(s) (e.g. 14451432017_FIXED_NORMAL_Mbuff_200_Vbuff1000.txt) with fields as follows:
```
Time 	 vbuffer 	 mbuffer (c) 	 mbuffer (f) 	 mbuffer_frames 	 MBuff_status
0.00	0.00	0.00	0.00	0	NEW
33.33	33.33	0.00	0.00	0	NEW
....
....
3800.00	2600.00	66.67	1500.00	24	PLAYING
3833.33	2600.00	33.33	1466.67	23	PLAYING
3866.67	2633.33	0.00	1533.33	26	BUFFERING
3900.00	2666.67	0.00	1533.33	30	BUFFERING
```
##### Non-Detailed Analysis (Multiple Files)
File (e.g. 16571232017_N_analysis_400.txt) with fields containing averages for simulations ran, as follows:
```
Buffsize 	 R.Events 	 R.Frames 	 IR.Frames 	 R.Duration 	 EndSize 	 StartT 	 FirstRT 	 TimeInSync 	 Displayed 	 Dropped 
100	2.39	8.02	31.43	187.58	7.37	1014.42	1355.17	0.12	1164.94	215.69
200	1.19	3.20	35.71	67.00	8.03	1156.92	1262.08	0.44	1164.28	57.48
```