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
plotDrops = True


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


def plotTriDataPoints(Xnorm, Ynorm, Xuni, Yuni, Znorm, Zuni, Xlabel, Ylabel, Extension = FILE_EXTENSION, ShowGraph = SHOW_GRAPHS):
    ticksXmajor = np.arange(100, int(Xuni[len(Xuni)-1]), 200)
    ticksXminor = np.arange(0, int(Xuni[len(Xuni)-1]), 200)
    fig1, ax1 = plt.subplots()
    ax1.plot(Xnorm, Ynorm, 'r', label='Dropped Normal Distr.')
    ax1.plot(Xuni, Yuni, 'b', label='Dropped Uniform Distr.')
#    ax1.plot(Xnorm, Znorm, 'y', label='Displayed Normal Distr.')
#    ax1.plot(Xuni, Zuni, 'o', label='Displayed Uniform Distr.')
    ax1.plot(Xnorm, Znorm, 'y', label='Buffered Normal Distr.')
    ax1.plot(Xuni, Zuni, 'c', label='Buffered Uniform Distr.')
    ax1.set_ylim(0)
    ax1.set_xticks(ticksXmajor, minor=False)
    ax1.set_xticks(ticksXminor, minor=True)
    ax1.grid(which='both')
    ax1.grid(which='minor', alpha=0.3, linestyle=':')
    ax1.grid(which='major', alpha=0.7, linestyle='--')
    ax1.set_ylabel(Ylabel)
    ax1.set_xlabel(Xlabel)

    #unkcomment following 4 lines for duration of drops
#    ax2 = ax1.twinx()
#    ax2.set_ylabel('Duration (ms)')
#    ymin, ymax = ax1.get_ylim()
#    ax2.set_ylim([ymin, (ymax * 33.3)])

    legend = ax1.legend(loc='upper center', shadow=False, fontsize='large')
    legend.get_frame().set_facecolor('#F2F4F7')
    if SAVE_TO_FILE:
        extracts = [c for c in ANALYSIS_SUM_FILE_N.split('_')]
        filename=extracts[0]+'_MBuff_'+extracts[len(extracts)-1].split('.')[0]+'__'+Ylabel.replace(" ", "").replace(".", "")
        plt.savefig(OUT_DIR+'/'+filename+Extension)
    if ShowGraph:
        plt.show()


def plotPercentage(Xnorm, Ynorm, Xuni, Yuni, Znorm, Zuni, Xlabel, Ylabel, Extension = FILE_EXTENSION, ShowGraph = SHOW_GRAPHS):
    ticksXmajor = np.arange(100, int(Xuni[len(Xuni)-1]), 200)
    ticksXminor = np.arange(0, int(Xuni[len(Xuni)-1]), 200)
    fig1, ax1 = plt.subplots()
    print( np.divide(Ynorm, Znorm))
#    ax1.plot(Xnorm, [((safeDiv(b,a))*100) for a,b in zip(Ynorm, Znorm)], 'r', label='Normal Distr.')
#    ax1.plot(Xuni, [((safeDiv(b,a))*100) for a,b in zip(Yuni, Zuni)], 'b', label='Uniform Distr.')
    ax1.plot(Xnorm,  np.divide(Ynorm, Znorm)*100, 'r', label='Normal Distr.')
    ax1.plot(Xnorm,  np.divide(Yuni, Zuni)*100, 'b', label='Uniform Distr.')
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
    if SAVE_TO_FILE:
        extracts = [c for c in ANALYSIS_SUM_FILE_N.split('_')]
        filename=extracts[0]+'_MBuff_'+extracts[len(extracts)-1].split('.')[0]+'__'+Ylabel.replace(" ", "").replace(".", "")
        plt.savefig(OUT_DIR+'/'+filename+Extension)
    if ShowGraph:
        plt.show()

def safeDiv(a, b):
    print(a,'   ',b,b/a)
    try:
        return a/b
    except ZeroDivisionError:
        return 0



#ENTRY POINT

#Get data from files
if(ANALYSIS_SUM_FILE_N.find('DROP')<0):
    plotDrops = True
    wait = input("NO DROPS FOUND IN THE FILENAME - press key to continue.")
    
        
analysis_file_in_n = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_N)
analysis_file_in_u = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_U)
toDrawN = readAnalysisFile(analysis_file_in_n)
toDrawU = readAnalysisFile(analysis_file_in_u)



#Draw Dropped Frames / Buffered Frames / Displayed Frames / Mbuff size
plotTriDataPoints(toDrawN[0], toDrawN[10], toDrawU[0], toDrawU[10], toDrawN[3], toDrawU[3], 'Buffer Playback Threshold (ms)', 'No. of Frames')
#plotTriDataPoints(toDrawN[0], toDrawN[10], toDrawU[0], toDrawU[10], toDrawN[9], toDrawU[9], 'Buffer Playback Threshold (ms)', 'No. of Frames')
plotPercentage(toDrawN[0], toDrawN[10], toDrawU[0], toDrawU[10], toDrawN[9], toDrawU[9], 'Buffer Playback Threshold (ms)', '% of Frames Dropped')






