import matplotlib.pyplot as plt
import numpy as np
import csv
import sys



#PARAMETERS

DATA_DIR = "data"
ANALYSIS_SUM_FILE_N = "16571232017_N_analysis_200.txt"  # Normal Distribution
ANALYSIS_SUM_FILE_U = "16571232017_U_analysis_200.txt"  # Uniform Distribution


#HOLDERS

Buffsize = []
RebuffEvents = []
RebuffFrames = []
RebuffDuration = []



#FUNCTIONS

def readAnalysisFile(file_in):
    """ Input filename to read, return list with [Buffersize], [Rebuff Events], [Rebuff Frames], [Rebuff Duration]"""
    BS = []  #buffer size
    RBE = [] #rebuffer events
    RBF = [] #rebuffer frames
    RBD = [] #rebuffer duration
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
                RBD.append(float(row[3]))
            i+=1
        results.append(BS)
        results.append(RBE)
        results.append(RBF)
        results.append(RBD)
        return results

def plotData(Xnorm, Ynorm, Xuni, Yuni, Xlabel, Ylabel, SaveToFile = False, Extension='.pdf', ShowGraph=True):
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
    plt.show()





#ENTRY POINT

#Get data from files
analysis_file_in_n = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_N)
analysis_file_in_u = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_U)
toDrawN = readAnalysisFile(analysis_file_in_n)
toDrawU = readAnalysisFile(analysis_file_in_u)

#Draw Rebuff Events / Mbuff size
plotData(toDrawN[0], toDrawN[1], toDrawU[0], toDrawU[1], 'Buffer Size (s)', 'Avg. Rebuff Events', )
#Draw Rebuff Frames / Mbuff size
plotData(toDrawN[0], toDrawN[2], toDrawU[0], toDrawU[2], 'Buffer Size (s)', 'Avg. Rebuff Frames')


#EXIT POINT

