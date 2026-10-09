# Oracle hand traces (computed BEFORE reading js/ or tests/)

Conventions: CT = completion, TAT = CT - arrival, WT = TAT - burst, RT = first start - arrival.
CS = number of times CPU goes from one process to a DIFFERENT process (idle in between does not reset; first dispatch not counted).
RR rule: arrivals in (sliceStart, sliceEnd] are enqueued before the preempted process is re-enqueued.
Queue notation: q=[head ... tail] AFTER the dispatch / requeue at that time.

## Dataset A: P1(0,5,p2) P2(1,3,p1) P3(2,8,p3) P4(3,4,p2) ; sum burst 20

### FCFS A
t0 ready[P1] -> P1 0-5 | t5 ready[P2,P3,P4] -> P2 5-8 | t8 -> P3 8-16 | t16 -> P4 16-20
Timeline: P1 0-5 | P2 5-8 | P3 8-16 | P4 16-20
CT 5,8,16,20  TAT 5,7,14,17 (43)  WT 0,4,6,13 (23)  RT 0,4,6,13 (23)
avgWT 5.75  avgTAT 10.75  avgRT 5.75  CS 3   total 20 busy 20 util 1 thr 0.2

### SJF A
t0 cand{P1:5} -> P1 0-5 | t5 cand{P2:3,P3:8,P4:4} -> P2 5-8 | t8 cand{P3:8,P4:4} -> P4 8-12 | t12 -> P3 12-20
Timeline: P1 0-5 | P2 5-8 | P4 8-12 | P3 12-20
CT 5,8,20,12  TAT 5,7,18,9 (39)  WT 0,4,10,5 (19)  RT 0,4,10,5 (19)
avgWT 4.75  avgTAT 9.75  avgRT 4.75  CS 3

### Priority A (smaller = higher)
t0 cand{P1:p2} -> P1 0-5 | t5 cand{P2:p1,P3:p3,P4:p2} -> P2 5-8 | t8 cand{P3:p3,P4:p2} -> P4 8-12 | t12 -> P3 12-20
Timeline: P1 0-5 | P2 5-8 | P4 8-12 | P3 12-20
CT 5,8,20,12  TAT 5,7,18,9 (39)  WT 0,4,10,5 (19)  RT 0,4,10,5 (19)
avgWT 4.75  avgTAT 9.75  avgRT 4.75  CS 3

### RR q=2 A
t0  q=[P1] dispatch P1, run 0-2, rem P1=3; arrivals (0,2]: P2@1,P3@2 -> [P2,P3]; requeue P1 -> [P2,P3,P1]
t2  dispatch P2 q=[P3,P1], run 2-4, rem P2=1; arrival P4@3 -> [P3,P1,P4]; requeue P2 -> [P3,P1,P4,P2]
t4  dispatch P3 q=[P1,P4,P2], run 4-6, rem P3=6 -> [P1,P4,P2,P3]
t6  dispatch P1 q=[P4,P2,P3], run 6-8, rem P1=1 -> [P4,P2,P3,P1]
t8  dispatch P4 q=[P2,P3,P1], run 8-10, rem P4=2 -> [P2,P3,P1,P4]
t10 dispatch P2 q=[P3,P1,P4], run 10-11, P2 done@11
t11 dispatch P3 q=[P1,P4], run 11-13, rem P3=4 -> [P1,P4,P3]
t13 dispatch P1 q=[P4,P3], run 13-14, P1 done@14
t14 dispatch P4 q=[P3], run 14-16, P4 done@16
t16 dispatch P3 q=[], run 16-18 rem 2, queue empty -> continues 18-20, done@20 (merged 16-20)
Timeline: P1 0-2 | P2 2-4 | P3 4-6 | P1 6-8 | P4 8-10 | P2 10-11 | P3 11-13 | P1 13-14 | P4 14-16 | P3 16-20
CT 14,11,20,16  TAT 14,10,18,13 (55)  WT 9,7,10,9 (35)  RT 0,1,2,5 (8)
avgWT 8.75  avgTAT 13.75  avgRT 2.0  CS 9

### RR q=1 A
t0  q=[P1] P1 0-1 rem4; arr P2 -> [P2]; requeue -> [P2,P1]
t1  P2 1-2 rem2 (q=[P1]); arr P3 -> [P1,P3]; requeue -> [P1,P3,P2]
t2  P1 2-3 rem3 (q=[P3,P2]); arr P4 -> [P3,P2,P4]; requeue -> [P3,P2,P4,P1]
t3  P3 3-4 rem7 -> [P2,P4,P1,P3]
t4  P2 4-5 rem1 -> [P4,P1,P3,P2]
t5  P4 5-6 rem3 -> [P1,P3,P2,P4]
t6  P1 6-7 rem2 -> [P3,P2,P4,P1]
t7  P3 7-8 rem6 -> [P2,P4,P1,P3]
t8  P2 8-9 done@9 -> [P4,P1,P3]
t9  P4 9-10 rem2 -> [P1,P3,P4]
t10 P1 10-11 rem1 -> [P3,P4,P1]
t11 P3 11-12 rem5 -> [P4,P1,P3]
t12 P4 12-13 rem1 -> [P1,P3,P4]
t13 P1 13-14 done@14 -> [P3,P4]
t14 P3 14-15 rem4 -> [P4,P3]
t15 P4 15-16 done@16 -> [P3]
t16 P3 16-20 (alone, merged) done@20
Timeline: P1 0-1 | P2 1-2 | P1 2-3 | P3 3-4 | P2 4-5 | P4 5-6 | P1 6-7 | P3 7-8 | P2 8-9 | P4 9-10 | P1 10-11 | P3 11-12 | P4 12-13 | P1 13-14 | P3 14-15 | P4 15-16 | P3 16-20
CT 14,9,20,16  TAT 14,8,18,13 (53)  WT 9,5,10,9 (33)  RT 0,0,1,2 (3)
avgWT 8.25  avgTAT 13.25  avgRT 0.75  CS 16 (17 entries)

### RR q=3 A
t0  q=[P1] P1 0-3 rem2; arr P2,P3,P4 -> [P2,P3,P4]; requeue -> [P2,P3,P4,P1]
t3  P2 3-6 done@6 -> [P3,P4,P1]
t6  P3 6-9 rem5 -> [P4,P1,P3]
t9  P4 9-12 rem1 -> [P1,P3,P4]
t12 P1 12-14 done@14 -> [P3,P4]
t14 P3 14-17 rem2 -> [P4,P3]
t17 P4 17-18 done@18 -> [P3]
t18 P3 18-20 done@20
Timeline: P1 0-3 | P2 3-6 | P3 6-9 | P4 9-12 | P1 12-14 | P3 14-17 | P4 17-18 | P3 18-20
CT 14,6,20,18  TAT 14,5,18,15 (52)  WT 9,2,10,11 (32)  RT 0,2,4,6 (12)
avgWT 8.0  avgTAT 13.0  avgRT 3.0  CS 7

## Dataset B: P1(0,8,p2) P2(0,4,p1) P3(0,2,p3) P4(0,6,p2) ; sum burst 20

### FCFS B (ties -> input order)
Timeline: P1 0-8 | P2 8-12 | P3 12-14 | P4 14-20
CT 8,12,14,20  TAT 8,12,14,20 (54)  WT 0,8,12,14 (34)  RT same (34)
avgWT 8.5  avgTAT 13.5  avgRT 8.5  CS 3

### SJF B
t0 cand{P1:8,P2:4,P3:2,P4:6} -> P3 0-2 | t2 -> P2 2-6 | t6 -> P4 6-12 | t12 -> P1 12-20
Timeline: P3 0-2 | P2 2-6 | P4 6-12 | P1 12-20
CT 20,6,2,12  TAT 20,6,2,12 (40)  WT 12,2,0,6 (20)  RT same (20)
avgWT 5.0  avgTAT 10.0  avgRT 5.0  CS 3

### Priority B
t0 -> P2(p1) 0-4 | t4 cand{P1:p2,P3:p3,P4:p2}: P1/P4 tie p2, same arrival -> input order -> P1 4-12 | t12 -> P4 12-18 | t18 -> P3 18-20
Timeline: P2 0-4 | P1 4-12 | P4 12-18 | P3 18-20
CT 12,4,20,18  TAT 12,4,20,18 (54)  WT 4,0,18,12 (34)  RT same (34)
avgWT 8.5  avgTAT 13.5  avgRT 8.5  CS 3

### RR q=2 B
t0  q=[P1,P2,P3,P4] P1 0-2 rem6 -> [P2,P3,P4,P1]
t2  P2 2-4 rem2 -> [P3,P4,P1,P2]
t4  P3 4-6 done@6 -> [P4,P1,P2]
t6  P4 6-8 rem4 -> [P1,P2,P4]
t8  P1 8-10 rem4 -> [P2,P4,P1]
t10 P2 10-12 done@12 -> [P4,P1]
t12 P4 12-14 rem2 -> [P1,P4]
t14 P1 14-16 rem2 -> [P4,P1]
t16 P4 16-18 done@18 -> [P1]
t18 P1 18-20 done@20
Timeline: P1 0-2 | P2 2-4 | P3 4-6 | P4 6-8 | P1 8-10 | P2 10-12 | P4 12-14 | P1 14-16 | P4 16-18 | P1 18-20
CT 20,12,6,18  TAT 20,12,6,18 (56)  WT 12,8,4,12 (36)  RT 0,2,4,6 (12)
avgWT 9.0  avgTAT 14.0  avgRT 3.0  CS 9

## Dataset C: P1(0,3,p1) P2(8,4,p2) P3(15,2,p3) ; identical for FCFS/SJF/Priority/RR q=2
t0 P1 0-3 (RR: 0-2 then alone again 2-3, merged) | t3 nothing ready -> IDLE 3-8 | t8 P2 8-12 (RR merged) | IDLE 12-15 | t15 P3 15-17
Timeline: P1 0-3 | IDLE 3-8 | P2 8-12 | IDLE 12-15 | P3 15-17
CT 3,12,17  TAT 3,4,2 (9)  WT 0,0,0  RT 0,0,0
avgWT 0  avgTAT 3.0  avgRT 0  CS 2 (P1->P2 across idle, P2->P3 across idle)
totalTime 17, busyTime 9, idleTime 8, cpuUtilization 9/17 = 0.529411..., throughput 3/17 = 0.176470...

## Dataset D: P1(0,8,p1) P2(1,5,p1) P3(2,3,p1) P4(3,6,p1) ; sum burst 22

### FCFS D
Timeline: P1 0-8 | P2 8-13 | P3 13-16 | P4 16-22
CT 8,13,16,22  TAT 8,12,14,19 (53)  WT 0,7,11,13 (31)  RT same
avgWT 7.75  avgTAT 13.25  avgRT 7.75  CS 3  total 22 util 1 thr 4/22

### SJF D
t0 -> P1 0-8 | t8 cand{P2:5,P3:3,P4:6} -> P3 8-11 | t11 cand{P2:5,P4:6} -> P2 11-16 | t16 -> P4 16-22
Timeline: P1 0-8 | P3 8-11 | P2 11-16 | P4 16-22
CT 8,16,11,22  TAT 8,15,9,19 (51)  WT 0,10,6,13 (29)  RT same
avgWT 7.25  avgTAT 12.75  avgRT 7.25  CS 3

### Priority D (all p1 -> earlier arrival -> same as FCFS)
Timeline: P1 0-8 | P2 8-13 | P3 13-16 | P4 16-22
avgWT 7.75  avgTAT 13.25  avgRT 7.75  CS 3

### RR q=2 D
t0  q=[P1] P1 0-2 rem6; arr P2,P3 -> [P2,P3]; requeue -> [P2,P3,P1]
t2  P2 2-4 rem3 (q=[P3,P1]); arr P4@3 -> [P3,P1,P4]; requeue -> [P3,P1,P4,P2]
t4  P3 4-6 rem1 -> [P1,P4,P2,P3]
t6  P1 6-8 rem4 -> [P4,P2,P3,P1]
t8  P4 8-10 rem4 -> [P2,P3,P1,P4]
t10 P2 10-12 rem1 -> [P3,P1,P4,P2]
t12 P3 12-13 done@13 -> [P1,P4,P2]
t13 P1 13-15 rem2 -> [P4,P2,P1]
t15 P4 15-17 rem2 -> [P2,P1,P4]
t17 P2 17-18 done@18 -> [P1,P4]
t18 P1 18-20 done@20 -> [P4]
t20 P4 20-22 done@22
Timeline: P1 0-2 | P2 2-4 | P3 4-6 | P1 6-8 | P4 8-10 | P2 10-12 | P3 12-13 | P1 13-15 | P4 15-17 | P2 17-18 | P1 18-20 | P4 20-22
CT 20,18,13,22  TAT 20,17,11,19 (67)  WT 12,12,8,13 (45)  RT 0,1,2,5 (8)
avgWT 11.25  avgTAT 16.75  avgRT 2.0  CS 11

### RR q=1 D
t0 P1 0-1 rem7 -> [P2,P1] | t1 P2 1-2 rem4 -> arr P3: [P1,P3,P2] | t2 P1 2-3 rem6 -> arr P4: [P3,P2,P4,P1]
t3 P3 rem2 -> [P2,P4,P1,P3] | t4 P2 rem3 -> [P4,P1,P3,P2] | t5 P4 rem5 -> [P1,P3,P2,P4] | t6 P1 rem5 -> [P3,P2,P4,P1]
t7 P3 rem1 -> [P2,P4,P1,P3] | t8 P2 rem2 -> [P4,P1,P3,P2] | t9 P4 rem4 -> [P1,P3,P2,P4] | t10 P1 rem4 -> [P3,P2,P4,P1]
t11 P3 done@12 -> [P2,P4,P1] | t12 P2 rem1 -> [P4,P1,P2] | t13 P4 rem3 -> [P1,P2,P4] | t14 P1 rem3 -> [P2,P4,P1]
t15 P2 done@16 -> [P4,P1] | t16 P4 rem2 -> [P1,P4] | t17 P1 rem2 -> [P4,P1] | t18 P4 rem1 -> [P1,P4]
t19 P1 rem1 -> [P4,P1] | t20 P4 done@21 -> [P1] | t21 P1 done@22
Timeline (22 unit slices, no merges): P1 P2 P1 P3 P2 P4 P1 P3 P2 P4 P1 P3 P2 P4 P1 P2 P4 P1 P4 P1 P4 P1 (t=0..22)
CT 22,16,12,21  TAT 22,15,10,18 (65)  WT 14,10,7,12 (43)  RT 0,0,1,2 (3)
avgWT 10.75  avgTAT 16.25  avgRT 0.75  CS 21

### RR q=3 D
t0  P1 0-3 rem5; arr P2,P3,P4 -> [P2,P3,P4,P1]
t3  P2 3-6 rem2 -> [P3,P4,P1,P2]
t6  P3 6-9 done@9 -> [P4,P1,P2]
t9  P4 9-12 rem3 -> [P1,P2,P4]
t12 P1 12-15 rem2 -> [P2,P4,P1]
t15 P2 15-17 done@17 -> [P4,P1]
t17 P4 17-20 done@20 -> [P1]
t20 P1 20-22 done@22
Timeline: P1 0-3 | P2 3-6 | P3 6-9 | P4 9-12 | P1 12-15 | P2 15-17 | P4 17-20 | P1 20-22
CT 22,17,9,20  TAT 22,16,7,17 (62)  WT 14,11,4,11 (40)  RT 0,2,4,6 (12)
avgWT 10.0  avgTAT 15.5  avgRT 3.0  CS 7

## Edge cases

E1: P1(3,2) alone, all algorithms (RR q=2 slice = 2): IDLE 0-3 | P1 3-5
  CT 5 TAT 2 WT 0 RT 0 ; CS 0 ; total 5 busy 2 idle 3 util 0.4 thr 0.2

E2: P1(0,4) P2(2,2) RR q=2
  t0 P1 0-2 rem2; P2 arrives exactly at 2 -> enqueued first: [P2]; requeue P1 -> [P2,P1]
  t2 P2 2-4 done@4 -> [P1] ; t4 P1 4-6 done@6
  Timeline: P1 0-2 | P2 2-4 | P1 4-6 ; CT 6,4 TAT 6,2 WT 2,0 RT 0,0 ; avg TAT 4 WT 1 RT 0 ; CS 2

E3: P1(0,10,p5) P2(1,1,p0) SJF and Priority (non-preemptive)
  t0 only P1 -> P1 0-10 ; t10 P2 10-11
  CT 10,11 TAT 10,10 WT 0,9 RT 0,9 ; avg TAT 10 WT 4.5 RT 4.5 ; CS 1

E4: B(0,3) then A(0,3), SJF: tie burst, tie arrival -> input order -> B 0-3 | A 3-6
  output processes in input order [B, A]; CT B3 A6 ; TAT 3,6 ; WT 0,3 ; avg TAT 4.5 WT 1.5 RT 1.5 ; CS 1

E5: P1(0,6) alone RR q=1: one merged timeline entry P1 0-6 ; CT 6 TAT 6 WT 0 RT 0 ; CS 0

## Extra hand traces (computed after reading tests, before reading any js/ code)

RR q=4 D: t0 P1 0-4 rem4, arr P2,P3,P4 -> [P2,P3,P4,P1] | t4 P2 4-8 rem1 -> [P3,P4,P1,P2] | t8 P3 8-11 done -> [P4,P1,P2]
  | t11 P4 11-15 rem2 -> [P1,P2,P4] | t15 P1 15-19 done -> [P2,P4] | t19 P2 19-20 done -> [P4] | t20 P4 20-22
  CT 19,20,11,22 TAT 19,19,9,19 WT 11,14,6,13 RT 0,3,6,8 ; avg WT 11 TAT 16.5 RT 4.25 ; CS 6
  => sweep D q=[1,2,3,4,8]: avgWT [10.75,11.25,10,11,7.75] avgTAT [16.25,16.75,15.5,16.5,13.25] avgRT [0.75,2,3,4.25,7.75] CS [21,11,7,6,3]

X1 SJF P1(0,4) P2(4,1) P3(1,3): P1 0-4 | P2 4-5 (arrives exactly at decision time, shortest) | P3 5-8 ; WT 0,0,4 ; CS 2
X2 Priority P1(0,4,p3) P2(4,1,p0) P3(1,3,p2): same timeline as X1
X3 RR2 X(0,3) C(1,2) B(1,2): X 0-2 | C 2-4 | B 4-6 | X 6-7 (C,B same arrival -> input order) ; WT 4,1,3 RT 0,1,3 ; CS 3
X4 RR2 X(0,3) C(2,2) B(1,2): X 0-2 | B 2-4 | C 4-6 | X 6-7 (arrival before input order) ; WT 4,2,1 RT 0,2,1 ; CS 3
X5 RR2 P1(5,3) P2(6,2): IDLE 0-5 | P1 5-7 | P2 7-9 | P1 9-10 ; WT 2,1 RT 0,1 ; CS 2 ; total 10 busy 5 util 0.5 thr 0.2
X6 Priority P3(0,1,p1) P1(0,1,blank->1) P2(0,1,p2): P3 0-1 | P1 1-2 | P2 2-3
X7 RR2 P1(0,2) P2(0,3) P3(2,1): P1 0-2 (done) ; P3 arrives @2 behind P2 -> P2 2-4 | P3 4-5 | P2 5-6 ; WT 0,3,2 RT 0,2,2 ; CS 3
X8 RR3 A(0,4) B(2,5) C(3,2) D(3,1) E(10,3) F(16,2) G(17,1):
  A 0-3 | B 3-6 | C 6-8 | D 8-9 | A 9-10 | B 10-12 | E 12-15 | IDLE 15-16 | F 16-18 | G 18-19
  queues after dispatch: t3 [C,D,A] t6 [D,A,B] t8 [A,B] t9 [B] t10 [E] t12 [] t16 [] t18 []
  CT 10,12,8,9,15,18,19 WT 6,5,3,5,2,0,1 RT 0,1,3,5,2,0,1 ; avg WT 22/7 TAT 40/7 RT 12/7 ; CS 8 ; total 19 busy 18
X9 SJF P1(2,6) P2(0,3) P3(3,2) P4(3,2) P5(20,1) P6(5,9): P2 0-3 | P3 3-5 | P4 5-7 | P1 7-13 | P6 13-22 | P5 22-23 ; WT 5,0,0,2,2,8 ; CS 5
X10 Priority same + prios 2,5,1,1,0,0: P2 0-3 | P3 3-5 | P6 5-14 | P4 14-16 | P1 16-22 | P5 22-23 ; WT 14,0,0,11,2,0 ; CS 5
X11 FCFS P1(5,2) P2(0,1) P3(5,1) P4(1,1): P2 0-1 | P4 1-2 | IDLE 2-5 | P1 5-7 | P3 7-8 ; WT 0,0,2,0 ; CS 3 ; util 5/8 thr 0.5
X12 RR2 P1(0,5) P2(4,1): P1 0-4 (lone continuation merged) | P2 4-5 (arrived exactly at slice end, enqueued before P1) | P1 5-6 ; CS 2
X13 RR2 Z(0,1) Y(0,3) X(6,2) W(6,1): Z 0-1 | Y 1-4 | IDLE 4-6 | X 6-8 | W 8-9 ; WT 0,1,0,2 ; CS 3 ; util 7/9

Closed form:
L1 1000 x (arr 0, burst 1), any algorithm (RR q=1): P_i runs [i-1,i) ; avg WT 499.5 TAT 500.5 RT 499.5 ; CS 999
L2 1000 x (arr 0, burst 100), RR q=1: CT_i = 99000+i ; avg TAT 99500.5 WT 99400.5 RT 499.5 ; CS 99999 ; 100000 timeline entries
  stateAt(1500): running P501, ready = all other 999 ; stateAt(99500): running P501, 500 finished, ready P502..P1000

## Result
Engine output and every test expectation matched these traces on the first comparison; no re-trace was needed.
