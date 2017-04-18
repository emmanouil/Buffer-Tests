import matplotlib.pyplot as plt
import csv
import sys

#Parameters:

#the following two parameters are used if file is provided as argument when running the script
DATA_DIR = "data"
ANALYSIS_SUM_FILE = "16571232017_N_analysis_200.txt"
#ANALYSIS_SUM_FILE = "16571232017_U_analysis_200.txt"

#Holders
Buffsize = []
RebuffEvents = []
RebuffFrames = []
RebuffDuration = []


#Entry point:

###Check if file was provided (else se default)
##if(len(sys.argv)>1):
##    analysis_file_in = sys.argv[1]
##else:
analysis_file_in = "%s/%s" % (DATA_DIR, ANALYSIS_SUM_FILE)


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

