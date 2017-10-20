import matplotlib.pyplot as plt
import numpy as np
import csv
import sys
from operator import add
import os



#PARAMETERS
os.chdir("..")
DATA_DIR = "node_out"
OUT_DIR = "plots"
ANALYSIS_SUM_FILE_N = "18372882017_N_analysis_400_DROP_[200-3200].txt"  # Normal Distribution
ANALYSIS_SUM_FILE_U = "18372882017_U_analysis_400_DROP_[200-3200].txt"  # Uniform Distribution
#ANALYSIS_SUM_FILE_U = "14141042017_N_analysis_500_DROP_WAIT_FRN.txt"  # Uniform Distribution w drops
#ANALYSIS_SUM_FILE_N = "14141042017_U_analysis_500_DROP_WAIT_FRN.txt"  # Normal Distribution w drops
#ANALYSIS_SUM_FILE_U = "13541042017_U_analysis_500_DROP_FRN.txt"  # Uniform Distribution w drops
#ANALYSIS_SUM_FILE_N = "13541042017_N_analysis_500_DROP_FRN.txt"  # Normal Distribution w drops

#OUTPUT
SAVE_TO_FILE = False
FILE_EXTENSION = '.png'
SHOW_GRAPHS = True


#HOLDERS

Buffsize = []
RebuffEvents = []
RebuffFrames = []
RebuffDuration = []

#AUTO-SET
plotDrops = False

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
    DSPF = [] #Displayed Frames
    DRPF = [] #Dropped Frames
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
                DSPF.append(float(row[9]))
                DRPF.append(float(row[10]))
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
        results.append(DSPF)
        results.append(DRPF)
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


def plotTimes(tInitN, cl1, tInitU, cl2, tBuffN, cl3, tBuffU, cl4, xAxis, xLabel, yLabel, a1l, a2l, b1l , b2l, SaveToFile = SAVE_TO_FILE, Extension = FILE_EXTENSION, ShowGraph = SHOW_GRAPHS):
    wd = 30
    Xlabel = xLabel
    Ylabel = yLabel
    fig, ax = plt.subplots()
    p1 = plt.bar(xAxis, tInitN, wd, color=cl1, label=a1l)
    p2 = plt.bar(xAxis, tBuffN, wd, color=cl2, label=a2l)
    p3 = plt.bar([x+wd+4 for x in xAxis], tInitU, wd, color=cl3, label=b1l)
    p4 = plt.bar([x+wd+4 for x in xAxis], tBuffU, wd, color=cl4, label=b2l)
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
if(ANALYSIS_SUM_FILE_N.find('DROP')>0):
    plotDrops = True
        
analysis_file_in_n = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_N)
analysis_file_in_u = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_U)
toDrawN = readAnalysisFile(analysis_file_in_n)
toDrawU = readAnalysisFile(analysis_file_in_u)

if(plotDrops):
    #Draw Stack Bar w/ Dropped  vs Displayed frames / Mbuff size
    plotTimes(list(map(add, toDrawN[9], toDrawN[10])), 'orange', list(map(add, toDrawU[9], toDrawU[10])), 'red', toDrawN[9], 'c', toDrawU[9], 'b', toDrawN[0], 'Buffer Playback Threshold (ms)', 'Avg. Total Frames Out (ms)','Total Frames N', 'Total Displayed N', 'Total Frames U', 'Total Displayed U')
    

#Draw Stack Bar w/ Initial Buffering Time vs Rebuffering Time / Mbuff size
plotTimes(toDrawN[6], 'red', toDrawU[6], 'orange', toDrawN[4], 'b', toDrawU[4], 'c', toDrawN[0], 'Buffer Playback Threshold (ms)', 'Avg. Buffering Duration (ms)','Initial Buffering N', 'Rebuffering N', 'Initial Buffering U', 'Rebuffering U')
#Draw Stack Bar w/ Initial Buffering Time vs Rebuffering Time / Mbuff size
plotTimes(list(map(add, toDrawN[6], toDrawN[4])), 'orange', list(map(add, toDrawU[6], toDrawU[4])), 'red', toDrawN[6], 'c', toDrawU[6], 'b', toDrawN[0], 'Buffer Playback Threshold (ms)', 'Buffering Duration (ms)','Total (Normal Distr.)', 'Initial (Normal Distr.)', 'Total (Uniform Distr.)', 'Initial (Uniform Distr.)')
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
#Draw Dropped Frames / Mbuff size
plotData(toDrawN[0], toDrawN[10], toDrawU[0], toDrawU[10], 'Buffer Playback Threshold (ms)', 'Dropped Frames')


#EXIT POINT

