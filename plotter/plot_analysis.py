import matplotlib.pyplot as plt
import csv
import sys



#Parameters:

DATA_DIR = "data"
ANALYSIS_SUM_FILE_N = "16571232017_N_analysis_200.txt"  # Normal Distribution
ANALYSIS_SUM_FILE_U = "16571232017_U_analysis_200.txt"  # Uniform Distribution


#Holders:

Buffsize = []
RebuffEvents = []
RebuffFrames = []
RebuffDuration = []



#Functions:

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
                BS.append(row[0])
                RBE.append(row[1])
                RBF.append(row[2])
                RBD.append(row[3])
            i+=1
        results.append(BS)
        results.append(RBE)
        results.append(RBF)
        results.append(RBD)
        return results




#Entry point:


with open(analysis_file_in, 'r') as f_in:
#    print("%s %s" % ("Analysis FILE IN: \n", f_in.read()))
    data_in = csv.reader(f_in, delimiter='\t')
    i = 0
    for row in data_in:
        if(row[0]=='0'):
            continue
        if(i>0):
            Buffsize.append(row[0])
            RebuffEvents.append(row[1])
            RebuffFrames.append(row[2])
            RebuffDuration.append(row[3])
        i+=1

    #Draw Stuff:
    plt.plot(Buffsize, RebuffEvents)
    plt.legend('Normal Distribution')
    plt.ylabel('Avg. Rebuff Frames')
    plt.xlabel('Buffer Size (s)')
    plt.ylim(ymin=0)
#    plt.xlim(xmin=0)
    plt.show()




#Exit point:

