import matplotlib.pyplot as plt
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




#ENTRY POINT

#Get data from files
analysis_file_in_n = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_N)
analysis_file_in_u = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE_U)
toDrawN = readAnalysisFile(analysis_file_in_n)
toDrawU = readAnalysisFile(analysis_file_in_u)

#Draw Stuff:

#Draw Rebuff Events
fig1, ax1 = plt.subplots()
ax1.plot(toDrawN[0], toDrawN[1], 'r', label='Normal Distr.')
ax1.plot(toDrawU[0], toDrawU[1], 'b', label='Uniform Distr.')
ax1.set_ylim(0)
ax1.set_ylabel('Avg. Rebuff Events')
ax1.set_xlabel('Buffer Size (s)')
legend = ax1.legend(loc='upper center', shadow=False, fontsize='large')
legend.get_frame().set_facecolor('#F2F4F7')

#Draw Rebuff Frames
fig1, ax2 = plt.subplots()
ax2.plot(toDrawN[0], toDrawN[2], 'r', label='Normal Distr.')
ax2.plot(toDrawU[0], toDrawU[2], 'b', label='Uniform Distr.')
ax2.set_ylim(0)
ax2.set_ylabel('Avg. Rebuff Frames')
ax2.set_xlabel('Buffer Size (s)')
legend = ax2.legend(loc='upper center', shadow=False, fontsize='large')
legend.get_frame().set_facecolor('#F2F4F7')

plt.show()


#EXIT POINT

