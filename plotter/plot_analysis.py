import matplotlib.pyplot as plt
import numpy as np
import csv
import sys
from operator import add



#PARAMETERS

DATA_DIR = "data"
OUT_DIR = "plots"
ANALYSIS_SUM_FILE_N = "1121242017_N_analysis_400.txt"  # Normal Distribution
ANALYSIS_SUM_FILE_U = "1121242017_U_analysis_400.txt"  # Uniform Distribution

#OUTPUT
SAVE_TO_FILE = True
FILE_EXTENSION = '.png'
SHOW_GRAPHS = False


#HOLDERS

Buffsize = []
RebuffEvents = []
RebuffFrames = []
RebuffDuration = []



#FUNCTIONS

def readAnalysisFile(file_in):
    """ Input filename to read, return list with [Buffersize], [Rebuff Events], [Rebuff Frames], [Rebuff Init], [Rebuff Duration], EndSize, StartT, FirstRT, TimeInSync"""
    BS = []  #buffer size
    RBE = [] #rebuff events
    RBF = [] #rebuff frames
    RBFI = [] #rebuff frames (initial)
    RBD = [] #rebuff duration
    BES = [] #buffer end size
    IPT = [] #initial playback time
    FRT = [] #first rebuffer time
    TISR = [] #Time in Sync Ratio
    results = []
    with open(file_in, 'r') as f_in:
        data_in = csv.reader(f_in, delimiter='\t')
        i = 0
        for row in data_in:
            if(row[0]=='0'):
                continue
            if(i>0):
                BS.append(int(row[0]))
                RBE.append(float(row[1]))
                RBF.append(float(row[2]))
                RBFI.append(float(row[3]))
                RBD.append(float(row[4]))
                BES.append(float(row[5]))
                IPT.append(float(row[6]))
                FRT.append(float(row[7]))
                TISR.append(float(row[8]))
            i+=1
        results.append(BS)
        results.append(RBE)
        results.append(RBF)
        results.append(RBFI)
        results.append(RBD)
        results.append(BES)
        results.append(IPT)
        results.append(FRT)
        results.append(TISR)
        return results

def plotData(Xnorm, Ynorm, Xuni, Yuni, Xlabel, Ylabel, SaveToFile = SAVE_TO_FILE, Extension = FILE_EXTENSION, ShowGraph = SHOW_GRAPHS):
    ticksXmajor = np.arange(100, int(Xuni[len(Xuni)-1]), 200)
    ticksXminor = np.arange(0, int(Xuni[len(Xuni)-1]), 200)
    fig1, ax1 = plt.subplots()
    ax1.plot(Xnorm, Ynorm, 'r', label='Normal Distr.')
    ax1.plot(Xuni, Yuni, 'b', label='Uniform Distr.')
    ax1.set_ylim(0)
    ax1.set_xticks(ticksXmajor, minor=False)
    ax1.set_xticks(ticksXminor, minor=True)
    ax1.grid(which='both')
    ax1.grid(which='minor', alpha=0.3, linestyle=':')
    ax1.grid(which='major', alpha=0.7, linestyle='--')
    ax1.set_ylabel(Ylabel)
    ax1.set_xlabel(Xlabel)
    legend = ax1.legend(loc='upper center', shadow=False, fontsize='large')
    legend.get_frame().set_facecolor('#F2F4F7')
    if SaveToFile:
        extracts = [c for c in ANALYSIS_SUM_FILE_N.split('_')]
        filename=extracts[0]+'_MBuff_'+extracts[len(extracts)-1].split('.')[0]+'__'+Ylabel.replace(" ", "").replace(".", "")
        plt.savefig(OUT_DIR+'/'+filename+Extension)
    if ShowGraph:
        plt.show()


def plotTimes(tInitN, tInitU, tBuffN, tBuffU, xAxis, SaveToFile = SAVE_TO_FILE, Extension = FILE_EXTENSION, ShowGraph = SHOW_GRAPHS):
    wd = 30
    Xlabel = 'Buffer Playback Threshold (ms)'
    Ylabel = 'Avg. Buffering Duration (ms)'
    fig, ax = plt.subplots()
    p1 = plt.bar(xAxis, tInitN, wd, color='blue', label='Rebuffering N')
    p2 = plt.bar(xAxis, tBuffN, wd, color='red', label='Initial Buffering N')
    p3 = plt.bar([x+wd+4 for x in xAxis], tInitU, wd, color='c', label='Rebuffering U')
    p4 = plt.bar([x+wd+4 for x in xAxis], tBuffU, wd, color='m', label='Initial Buffering U')
    plt.xlabel(Xlabel)
    plt.ylabel(Ylabel)
    ax.grid(axis='y')
    ax.grid(axis='y', which='minor', alpha=0.3, linestyle=':')
    ax.grid(axis='y', which='major', alpha=0.7, linestyle='--')
    legend = ax.legend(loc='upper left', shadow=False, fontsize='9')
    if SAVE_TO_FILE:
        extracts = [c for c in ANALYSIS_SUM_FILE_N.split('_')]
        filename=extracts[0]+'_MBuff_'+extracts[len(extracts)-1].split('.')[0]+'__'+Ylabel.replace(" ", "").replace(".", "")
        plt.savefig(OUT_DIR+'/'+filename+Extension)
    if ShowGraph:
        plt.show()


#ENTRY POINT

#Get data from files
analysis_file_in_n = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_N)
analysis_file_in_u = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_U)
toDrawN = readAnalysisFile(analysis_file_in_n)
toDrawU = readAnalysisFile(analysis_file_in_u)

#Draw Stack Bar w/ Initial Buffering Time vs Rebuffering Time / Mbuff size
plotTimes(toDrawN[6], toDrawU[6], toDrawN[4], toDrawU[4], toDrawN[0])
#wait = input("PRESS ENTER TO CONTINUE.")

#Draw Rebuff Events / Mbuff size
plotData(toDrawN[0], toDrawN[1], toDrawU[0], toDrawU[1], 'Buffer Playback Threshold (ms)', 'Avg. Rebuff Events', )
#Draw Rebuff Frames / Mbuff size
plotData(toDrawN[0], toDrawN[2], toDrawU[0], toDrawU[2], 'Buffer Playback Threshold (ms)', 'Avg. Rebuff Frames')
#Draw Init Rebuff Frames / Mbuff size
plotData(toDrawN[0], toDrawN[3], toDrawU[0], toDrawU[3], 'Buffer Playback Threshold (ms)', 'Avg. Init Rebuff Frames')
#Draw Total Rebuff Frames / Mbuff size
plotData(toDrawN[0], list(map(add, toDrawN[2], toDrawN[3])), toDrawU[0], list(map(add, toDrawU[2], toDrawU[3])), 'Buffer Playback Threshold (ms)', 'Avg. Total Rebuff Frames')
#Draw Buffer End Size / Mbuff size
plotData(toDrawN[0], toDrawN[5], toDrawU[0], toDrawU[5], 'Buffer Playback Threshold (ms)', 'Avg. Buffer End Size (Frames)')
#Draw Initial Playback Time / Mbuff size
plotData(toDrawN[0], toDrawN[6], toDrawU[0], toDrawU[6], 'Buffer Playback Threshold (ms)', 'Avg. Initial Playback Time (ms)')
##Draw Initial Playback Time / Mbuff size
#plotData(toDrawN[0], toDrawN[7], toDrawU[0], toDrawU[7], 'Buffer Playback Threshold (ms)', 'Avg. First Rebuff Time (ms)')
#Draw Initial Playback Time / Mbuff size
plotData(toDrawN[0], toDrawN[8], toDrawU[0], toDrawU[8], 'Buffer Playback Threshold (ms)', 'Avg. Time in Sync Ratio')


#EXIT POINT

