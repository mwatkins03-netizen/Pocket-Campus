"""Fetch USGS 3DEP lidar points (Entwine Point Tiles, public AWS bucket) for a small box; save x,y (local metres east/north of centre), z, class, return info."""
import sys, json, math, io, os, urllib.request, concurrent.futures as cf
import numpy as np, laspy
BASE='https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MS_MississippiDelta_A1_2018/'
lat,lon,half,out=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]),sys.argv[4]
R=6378137.0
mx=math.radians(lon)*R; my=math.log(math.tan(math.pi/4+math.radians(lat)/2))*R
k=1/math.cos(math.radians(lat))          # mercator metres per ground metre
box=(mx-half*k,my-half*k,mx+half*k,my+half*k)
def get(u,tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(BASE+u,timeout=60) as r: return r.read()
        except Exception as e:
            if i==tries-1: raise
ept=json.loads(get('ept.json')); B=ept['bounds']; span=B[3]-B[0]
def nb(d,x,y,z):
    s=span/2**d; return (B[0]+x*s,B[1]+y*s,B[0]+(x+1)*s,B[1]+(y+1)*s)
def hit(b): return not(b[2]<box[0] or b[0]>box[2] or b[3]<box[1] or b[1]>box[3])
nodes=[]
def walk(root):
    H=json.loads(get('ept-hierarchy/%s.json'%root))
    for key,n in H.items():
        d,x,y,z=map(int,key.split('-'))
        if not hit(nb(d,x,y,z)): continue
        if n==-1:
            if key!=root: walk(key)
        elif n>0: nodes.append(key)
walk('0-0-0-0')
print(len(nodes),'nodes',file=sys.stderr)
def load(key):
    las=laspy.read(io.BytesIO(get('ept-data/%s.laz'%key)))
    x=np.asarray(las.x);y=np.asarray(las.y)
    m=(x>=box[0])&(x<=box[2])&(y>=box[1])&(y<=box[3])
    return np.c_[(x[m]-mx)/k,(y[m]-my)/k,np.asarray(las.z)[m],np.asarray(las.classification)[m],np.asarray(las.return_number)[m],np.asarray(las.number_of_returns)[m]]
with cf.ThreadPoolExecutor(12) as ex: parts=list(ex.map(load,nodes))
P=np.concatenate(parts).astype(np.float32)
np.save(out,P); print(out,P.shape,'z',P[:,2].min(),P[:,2].max(),'classes',np.unique(P[:,3],return_counts=True),file=sys.stderr)
