# Buffer-Tests


## TODO

TODO


## Files


### data_generator
Created files containing sample Video and Meta frames. (####OPTIONS:)

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


### analyzer_clean
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
File (e.g. 16571232017_N_analysis_200.txt) with fields containing averages for simulations ran, as follows:
```
Buffsize 	 R.Events 	 R.Frames 	 R.Duration 
0	0.00	0.00	0.00
100	4.39	243.01	7960.50
200	4.04	107.97	3466.67
```