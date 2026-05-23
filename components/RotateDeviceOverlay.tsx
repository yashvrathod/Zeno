'use client';

export default function RotateDeviceOverlay() {
  return (
    <div className="rotate-device-overlay fixed inset-0 z-[200] flex-col items-center justify-center bg-black">
      <svg className="w-[min(40vw,140px)] h-auto overflow-visible mb-8" width="1377" height="261" viewBox="0 0 1377 261" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1360.76 194.46C1366.12 188.212 1365.34 178.861 1359.04 173.551C1352.73 168.241 1343.3 169.006 1337.94 175.254C1322.47 193.291 1299.31 203.652 1274.4 203.652C1233.13 203.652 1199.54 170.377 1199.54 129.482C1199.54 88.5878 1233.13 55.3124 1274.4 55.3124C1307.94 55.3124 1335.96 79.1939 1342.03 110.694H1250.44C1242.17 110.694 1235.47 117.332 1235.47 125.528C1235.47 133.725 1242.17 140.362 1250.44 140.362H1358.22C1366.49 140.362 1373.19 133.725 1373.19 125.528V123.551C1373.19 69.5692 1328.88 25.6445 1274.4 25.6445C1216.61 25.6445 1169.6 72.2243 1169.6 129.482C1169.6 186.74 1216.61 233.305 1274.4 233.305C1308.11 233.305 1339.58 219.15 1360.76 194.446V194.46Z" fill="white"/>
      </svg>
      <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </div>
      <p className="text-white/70 text-sm font-medium tracking-wide text-center px-8">
        Please rotate your device for the best experience.
      </p>
    </div>
  );
}
