import matplotlib.pyplot as plt
import numpy as np
import csv
import sys
from os import listdir
from os.path import isfile, join


DATA_DIR = "data"
OUT_DIR = "plots"
DATA_ID = "17552432017"   # A Uniform sample
#DATA_ID = "8592132017"  # A Normal sample

#Plotting parameters
MBUFFSIZE = -1    #plot specific buffer size simulation
SAVE_TOF = True     #save produced plots to file
FILE_EXTENSION = '.png'     #plot file extension (.png, .pdf, .svg)
SHOW_GRAPH = False

def readAnalysisFile(file_in):
    """ Input filename to read, return list with [VBuffersize], [MBuffer Size (C) - ms], [MBuffer Size (F) - ms], [MBuffer - frames], [MBuffer - status]"""
    T = []  #time
    VBS = []  #Vbuffer size
    MBSC = [] #Mbuffer size
    MBSF = [] #Mbuffer size fragmented
    MBF = [] #Mbuffer size in frames
    results = []
    with open(file_in, 'r') as f_in:
        data_in = csv.reader(f_in, delimiter='\t')
        i = 0
        for row in data_in:
            if(row[0]=='0'):
                continue
            if(i>0):
                T.append(float(row[0]))
                VBS.append(float(row[1]))
                MBSC.append(float(row[2]))
                MBSF.append(float(row[3]))
                MBF.append(int(row[4]))
            i+=1
        results.append(T)
        results.append(VBS)
        results.append(MBSC)
        results.append(MBSF)
        results.append(MBF)
        return results

def plotData(MBuffSize = -1, SaveTofile = False, Extension = '.pdf', ShowGraph = True):
    for entry in fileObjects:
        if(MBuffSize != -1 and MBuffSize != entry['MBuff']):
            continue
        toDraw = readAnalysisFile(DATA_DIR+'/'+entry['File'])
        fig1, ax1 = plt.subplots()
        ax1.plot(toDraw[0], toDraw[1], 'b', label='Video Buffer')
        ax1.plot(toDraw[0], toDraw[2], 'r', label='Meta Buffer (C)')
        ax1.plot(toDraw[0], toDraw[3], 'y', label='Meta Buffer (F)')
        ax1.set_ylim(0)
        ax1.set_xlim(0,toDraw[0][len(toDraw[0])-1])
        ax1.grid(which='both')
    #    ax1.grid(which='minor', alpha=0.3, linestyle=':')
    #    ax1.grid(which='major', alpha=0.7, linestyle='--')
        ax1.set_ylabel('Buffer Size (ms)')
        ax1.set_xlabel('Time (ms)')
        legend = ax1.legend(loc='upper center', shadow=False, fontsize='large')
        legend.get_frame().set_facecolor('#F2F4F7')
        print(ax1.get_ybound())
        plt.suptitle('BUFFER STATES - MBUFF:'+str(entry['MBuff'])+' DSTR:'+entry['Distr']+' DEP:'+str(entry['Depented']))
        if SaveTofile:
            plt.savefig(OUT_DIR+'/'+DATA_ID+'_MBuff'+str(entry['MBuff'])+'_'+entry['Distr']+('_D' if entry['Depented'] else '')+Extension)
        if ShowGraph:
            plt.show()
        #input("Press Enter to continue...")

    


#ENTRY POINT
#get relevant files
valid_files = []
onlyfiles = [f for f in listdir(DATA_DIR) if isfile(join(DATA_DIR, f))] #get all files
for entry in onlyfiles:     #seperate those that match the id
    if entry.startswith(DATA_ID):
        valid_files.append(entry)
print(valid_files)

#extract info and create objects
fileObjects = []
for entry in valid_files:
    tmp = {}
    tmp['File'] = entry
    if entry.endswith('D.txt'):
        tmp['Depented'] = True
    else:
        tmp['Depented'] = False
        
    extracts = [c for c in entry.split('_')]
   
    
    for elem in extracts:
        if (elem == 'UNIFORM'):
            tmp['Distr'] = 'UNIFORM'
        elif (elem == 'NORMAL'):
            tmp['Distr'] = 'NORMAL'
        elif (elem.isdigit() and int(elem) != DATA_ID):
            tmp['MBuff'] = int(elem)
            continue
    fileObjects.append(tmp)


#plot data
plotData( MBUFFSIZE, SAVE_TOF, FILE_EXTENSION, SHOW_GRAPH)

    
   
