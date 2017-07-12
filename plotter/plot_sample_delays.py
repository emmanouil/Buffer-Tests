import matplotlib.pyplot as plt
import json
import math

DATA_DIR = "data"
ANALYSIS_SUM_FILE_N = "meta_out_min200_max3200_distrNORMAL_freq30_"  # Normal Distribution
ANALYSIS_SUM_FILE_U = "meta_out_min200_max3200_distrUNIFORM_freq30_"  # Uniform Distribution
EXTENSION = ".json"

samplesN = []
samplesU = []
delaysN = {}
delaysU = {}
minDN = 999999
minDU = 999999
maxDU = 0
maxDN = 0
dX = [] #[Delay]
dN = [] #[samplesN]
dU = [] #[samplesU]

#UNIFORM
#Parse
for i in range(200):
    with open(DATA_DIR+'/runs/'+ANALYSIS_SUM_FILE_U+str(i)+EXTENSION, 'r') as f_in:
        samplesU = json.load(f_in)

    for sample in samplesU:
        if str(math.ceil(sample['Delay']/50)) in delaysU:
            delaysU[str(math.ceil(sample['Delay']/50))] +=1
        else:
            delaysU[str(math.ceil(sample['Delay']/50))] =1
        if(sample['Delay']>maxDU):
            maxDU = sample['Delay']
        if(sample['Delay']<minDU):
            minDU = sample['Delay']
       


#NORMAL
for i in range(200):
    with open(DATA_DIR+'/runs/'+ANALYSIS_SUM_FILE_N+str(i)+EXTENSION, 'r') as f_in:
        samplesN = json.load(f_in)

    for sample in samplesN:
        if str(math.ceil(sample['Delay']/50)) in delaysN:
            delaysN[str(math.ceil(sample['Delay']/50))] +=1
        else:
            delaysN[str(math.ceil(sample['Delay']/50))] =1
        if(sample['Delay']>maxDN):
            maxDN = sample['Delay']
        if(sample['Delay']<minDN):
            minDN = sample['Delay']

if(minDN < minDU):
    minT = minDN
else:
    minT = minDU
if(maxDN > maxDU):
    maxT = maxDN
else:
    maxT = maxDU

print(minT)
print(maxT)
for i in range(minT+50, maxT+1, 50):
    if str(int(i/50)) not in delaysU:
        delaysU[str(int(i/100))] = 0
    if str(int(i/50)) not in delaysN:
        delaysN[str(int(i/50))] = 0
    dX.append(i)
    dU.append(delaysU[str(int(i/50))])
    dN.append(delaysN[str(int(i/50))])



#Plot
fig1, ax1 = plt.subplots()
print('dx %d',dX[0])
print('du %d',dU[0])
ax1.plot(dX, dU, color='b', marker='s', label='Uniform Distr.', alpha=.8)
ax1.plot(dX, dN, color='r', marker='^', label='Normal Distr.', alpha=.8)
ax1.set_ylim(0)
#ax1.set_xticks(ticksXmajor, minor=False)
#ax1.set_xticks(ticksXminor, minor=True)
ax1.grid(which='both')
#ax1.grid(which='minor', alpha=0.3, linestyle=':')
#ax1.grid(which='major', alpha=0.7, linestyle='--')
ax1.set_ylabel('Number of Samples')
ax1.set_xlabel('Delay (ms)')
legend = ax1.legend(loc='upper right', shadow=False, fontsize='large')
legend.get_frame().set_facecolor('#F2F4F7')
print('y-bound %d',ax1.get_ybound())
plt.show()
