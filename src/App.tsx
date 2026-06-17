import React, { useEffect, useRef, useState } from 'react';

const Button = ({ children, className = '', variant = 'default', size = 'default', ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900",
    ghost: "hover:bg-gray-100 hover:text-gray-900 text-gray-700",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm"
  };
  const sizes: any = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    icon: "h-10 w-10"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input = React.forwardRef(({ className = '', ...props }: any, ref) => (
  <input
    ref={ref}
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

const Card = ({ children, className = '' }: any) => (
  <div className={`rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm ${className}`}>
    {children}
  </div>
);

interface LongdoMapProps {
  className?: string;
  initialCenter?: { lat: number; lon: number };
  initialZoom?: number;
  onMapReady?: (map: any) => void;
  onClick?: (event: { lat: number; lon: number }) => void;
}

function LongdoMap({ className = '', initialCenter = { lat: 13.7563, lon: 100.5018 }, initialZoom = 13, onMapReady, onClick }: LongdoMapProps) {
  const mapId = useRef(`longdo-map-${Math.random().toString(36).substr(2, 9)}`).current;
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      if (!document.getElementById(mapId) || map.current || !(window as any).longdo) return;
      
      try {
        map.current = new (window as any).longdo.Map({
          placeholder: document.getElementById(mapId),
          zoom: initialZoom,
          location: { lat: initialCenter.lat, lon: initialCenter.lon },
          lastView: false
        });

        if (onClick) {
          map.current.Event.bind('click', () => {
            const location = map.current.location();
            onClick({ lat: location.lat, lon: location.lon });
          });
        }

        map.current.addMarker = function (lat: number, lon: number, title?: string) {
          const marker = new (window as any).longdo.Marker(
            { lat, lon },
            { title: title || '', detail: title || '' }
          );
          map.current.Overlays.add(marker);
          markersRef.current.push(marker);
          return marker;
        };

        map.current.clearMarkers = function () {
          markersRef.current.forEach((marker: any) => map.current.Overlays.remove(marker));
          markersRef.current = [];
        };

        map.current.drawRoute = function (points: Array<{ lat: number; lon: number }>) {
          if (points.length < 2) return;
          if (routePolylineRef.current) map.current.Route.clear();

          points.forEach((point) => {
            const marker = new (window as any).longdo.Marker({ lat: point.lat, lon: point.lon });
            map.current.Route.add(marker);
          });

          map.current.Route.search();
          routePolylineRef.current = true;
        };

        map.current.clearRoute = function () {
          if (routePolylineRef.current) {
            map.current.Route.clear();
            routePolylineRef.current = null;
          }
        };

        map.current.focusLocation = function (lat: number, lon: number, zoom?: number) {
          map.current.location({ lat, lon }, true);
          if (zoom) map.current.zoom(zoom, true);
        };

        if (onMapReady) onMapReady(map.current);
        
        setTimeout(() => map.current.resize(), 500);

      } catch (error) {
        console.error('Map init error:', error);
      }
    };

    if (!document.getElementById('longdo-map-script')) {
      const script = document.createElement('script');
      script.id = 'longdo-map-script';
      script.src = 'https://api.longdo.com/map/?key=6507d58aa4162fa33423059a71c9fc39';
      script.onload = () => { if (isMounted) initMap(); };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if ((window as any).longdo && isMounted) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
    }

    return () => { isMounted = false; };
  }, [initialCenter.lat, initialCenter.lon, initialZoom, mapId, onClick, onMapReady]);

  return <div id={mapId} className={`w-full h-full ${className}`} />;
}

interface Store {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  lat: number;
  lon: number;
  gmapLink?: string;
}

export default function App() {
  useEffect(() => {
    if (!document.querySelector('script[src="https://unpkg.com/@phosphor-icons/web"]')) {
      const script = document.createElement('script');
      script.src = "https://unpkg.com/@phosphor-icons/web";
      document.head.appendChild(script);
    }
  }, []);

  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success'|'error'}[]>([]);
  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error')
  };
  const showToast = (msg: string, type: 'success'|'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const mapRef = useRef<any>(null);

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('delivery_stores');
    return saved ? JSON.parse(saved) : [];
  });
  const [routeQueue, setRouteQueue] = useState<string[]>(() => {
    const saved = localStorage.getItem('delivery_route');
    return saved ? JSON.parse(saved) : [];
  });

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeNote, setStoreNote] = useState('');
  const [storeLat, setStoreLat] = useState('');
  const [storeLon, setStoreLon] = useState('');
  const [storeLink, setStoreLink] = useState('');
  const [activeTab, setActiveTab] = useState<'stores' | 'route'>('stores');
  const [searchInput, setSearchInput] = useState('');
  const [isMapPickingMode, setIsMapPickingMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => { localStorage.setItem('delivery_stores', JSON.stringify(stores)); }, [stores]);
  useEffect(() => { localStorage.setItem('delivery_route', JSON.stringify(routeQueue)); }, [routeQueue]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.clearMarkers) mapRef.current.clearMarkers();
    stores.forEach((store) => {
      if (mapRef.current && mapRef.current.addMarker) {
        mapRef.current.addMarker(store.lat, store.lon, store.name);
      }
    });
  }, [stores]);

  const extractCoordsFromLink = () => {
    if (!storeLink.trim()) {
      toast.error('กรุณาวางลิงก์ Google Maps');
      return;
    }
    try {
      const match = storeLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        setStoreLat(match[1]);
        setStoreLon(match[2]);
        toast.success('ถอดรหัสพิกัดสำเร็จ!');
      } else {
        toast.error('ไม่สามารถถอดรหัสพิกัดได้');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const saveStore = () => {
    if (!storeName.trim()) return toast.error('กรุณากรอกชื่อลูกค้า/ร้านค้า');
    if (!storeLat || !storeLon) return toast.error('กรุณาตั้งค่าพิกัด');

    const newStore: Store = {
      id: Date.now().toString(),
      name: storeName,
      phone: storePhone || undefined,
      note: storeNote || undefined,
      lat: parseFloat(storeLat),
      lon: parseFloat(storeLon),
      gmapLink: storeLink || undefined,
    };

    setStores([...stores, newStore]);
    setStoreName(''); setStorePhone(''); setStoreNote('');
    setStoreLat(''); setStoreLon(''); setStoreLink('');
    toast.success('บันทึกข้อมูลแล้ว');
  };

  const deleteStore = (id: string) => {
    setStores(stores.filter((s) => s.id !== id));
    setRouteQueue(routeQueue.filter((rid) => rid !== id));
    toast.success('ลบข้อมูลแล้ว');
  };

  const addToRoute = (id: string) => {
    if (!routeQueue.includes(id)) {
      setRouteQueue([...routeQueue, id]);
      setSearchInput('');
      toast.success('เพิ่มเข้าเส้นทางแล้ว');
    }
  };

  const removeFromRoute = (id: string) => setRouteQueue(routeQueue.filter((rid) => rid !== id));

  const moveRouteUp = (index: number) => {
    if (index > 0) {
      const newQueue = [...routeQueue];
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
      setRouteQueue(newQueue);
    }
  };

  const moveRouteDown = (index: number) => {
    if (index < routeQueue.length - 1) {
      const newQueue = [...routeQueue];
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      setRouteQueue(newQueue);
    }
  };

  const reverseRoute = () => {
    if (routeQueue.length < 2) return;
    setRouteQueue([...routeQueue].reverse());
    toast.success('สลับลำดับเส้นทางไป-กลับแล้ว');
  };

  const copyRoute = () => {
    if (routeQueue.length === 0) return toast.error('ยังไม่มีรายการจัดส่ง');
    let textToCopy = '🚚 ลำดับคิวจัดส่งวันนี้:\n===================\n';
    routeQueue.forEach((id, index) => {
      const store = stores.find((s) => s.id === id);
      if (store) {
        textToCopy += `${index + 1}. ${store.name}\n`;
        if (store.phone) textToCopy += `   📞 โทร: ${store.phone}\n`;
        if (store.note) textToCopy += `   📝 หมายเหตุ: ${store.note}\n`;
        textToCopy += `-------------------\n`;
      }
    });
    textToCopy += 'ขับรถปลอดภัยนะครับ! 🚙💨';

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success('คัดลอกข้อความแล้ว นำไปวางใน Line ได้เลย!');
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('คัดลอกข้อความแล้ว นำไปวางใน Line ได้เลย!');
      } catch (err) {
        toast.error('ไม่สามารถคัดลอกได้');
      }
      document.body.removeChild(textArea);
    });
  };

  const calculateRoute = () => {
    if (routeQueue.length < 2) return toast.error('ต้องมีจุดอย่างน้อย 2 จุด');
    if (!mapRef.current) return;

    try {
      const routeCoords = routeQueue
        .map((id) => stores.find((s) => s.id === id))
        .filter((store) => store !== undefined)
        .map((store) => ({ lat: store!.lat, lon: store!.lon }));

      if (routeCoords.length < 2) return;
      if (mapRef.current.drawRoute) {
        mapRef.current.drawRoute(routeCoords);
      }
      setIsPanelOpen(false);
      toast.success('กำลังวาดเส้นทางบนแผนที่... 🚚');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการคำนวณเส้นทาง');
    }
  };

  const clearRoute = () => {
    if (routeQueue.length === 0) return;
    if (window.confirm('ล้างเส้นทางทั้งหมดใช่หรือไม่?')) {
      setRouteQueue([]);
      if (mapRef.current && mapRef.current.clearRoute) mapRef.current.clearRoute();
      toast.success('ล้างข้อมูลแล้ว');
    }
  };

  const focusMap = (lat: number, lon: number) => {
    setIsPanelOpen(false);
    if (mapRef.current && mapRef.current.focusLocation) {
      mapRef.current.focusLocation(lat, lon, 16);
    }
  };

  const startPickingMode = () => {
    setIsMapPickingMode(true);
    setIsPanelOpen(false);
    toast.success('เลื่อนแผนที่และคลิกเพื่อเลือกจุด');
  };

  const availableStores = stores.filter(
    (s) =>
      !routeQueue.includes(s.id) &&
      (s.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        (s.note && s.note.toLowerCase().includes(searchInput.toLowerCase())))
  );

  return (
    <div className="relative w-full h-screen bg-gray-200 overflow-hidden font-sans">
      
      <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 transform transition-all duration-300 ${t.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
            <i className={`ph-bold ${t.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-xl`}></i>
            {t.msg}
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/50">
        <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-700 tracking-tight">
          <i className="ph-fill ph-map-trifold text-2xl"></i> Route Planner Pro
        </h1>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3 bg-white/90 backdrop-blur-xl p-2.5 rounded-full shadow-2xl border border-white">
        <Button onClick={() => {setActiveTab('stores'); setIsPanelOpen(true);}} className="rounded-full px-5 py-6 text-base shadow-md gap-2 font-bold bg-indigo-600">
          <i className="ph-bold ph-storefront text-xl"></i> ฐานข้อมูล
        </Button>
        <Button onClick={() => {setActiveTab('route'); setIsPanelOpen(true);}} className="rounded-full px-5 py-6 text-base shadow-md gap-2 font-bold bg-emerald-600 hover:bg-emerald-700">
          <i className="ph-bold ph-routing text-xl"></i> จัดเส้นทาง
        </Button>
      </div>

      {isMapPickingMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-3 rounded-full shadow-2xl z-40 flex items-center gap-2 animate-pulse font-bold border-2 border-white">
          <i className="ph-bold ph-crosshair text-2xl"></i> คลิกบนแผนที่เพื่อระบุพิกัด
        </div>
      )}

      {isPanelOpen && (
        <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-6 transition-all duration-300">
          
          <div className="w-full md:w-[500px] h-[85vh] md:h-[80vh] bg-gray-50 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border border-white/50">
            
            <div className="p-4 bg-white flex justify-between items-center border-b border-gray-100 shrink-0">
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                <button onClick={() => setActiveTab('stores')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'stores' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-indigo-600'}`}>
                  <i className="ph-bold ph-storefront text-lg"></i> เพิ่ม/ลบ ร้านค้า
                </button>
                <button onClick={() => setActiveTab('route')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'route' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-emerald-600'}`}>
                  <i className="ph-bold ph-routing text-lg"></i> ลำดับคิวส่ง
                </button>
              </div>
              <button onClick={() => setIsPanelOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 flex items-center justify-center transition-colors">
                <i className="ph-bold ph-x text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-5 pb-8">
              {activeTab === 'stores' ? (
                <>
                  <Card className="p-4 md:p-5 shadow-sm border-0 ring-1 ring-gray-100">
                    <h2 className="font-bold mb-4 flex items-center gap-2 text-indigo-700 text-lg">
                      <i className="ph-fill ph-map-pin-plus"></i> เพิ่มจุดส่งสินค้าใหม่
                    </h2>
                    <div className="space-y-4">
                      <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                        <label className="block text-sm font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                          <i className="ph-bold ph-link text-indigo-600"></i> วางลิงก์ Google Maps
                        </label>
                        <div className="flex flex-col gap-2">
                          <Input value={storeLink} onChange={(e: any) => setStoreLink(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                          <Button onClick={extractCoordsFromLink} className="w-full gap-2 font-bold">
                            <i className="ph-bold ph-magic-wand text-lg"></i> ดึงพิกัด
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <hr className="flex-1 border-gray-200" /><span className="text-xs text-gray-400 font-semibold tracking-wider">หรือ</span><hr className="flex-1 border-gray-200" />
                      </div>

                      <Button onClick={startPickingMode} variant="outline" className="w-full font-bold gap-2 py-6 border-2 border-dashed border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">
                        <i className="ph-bold ph-crosshair text-xl"></i> จิ้มเลือกลงบนแผนที่ด้วยตัวเอง
                      </Button>

                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อลูกค้า / ร้านค้า <span className="text-red-500">*</span></label>
                          <Input value={storeName} onChange={(e: any) => setStoreName(e.target.value)} placeholder="ระบุชื่อสถานที่" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">เบอร์โทร</label>
                            <Input value={storePhone} onChange={(e: any) => setStorePhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">รายละเอียด</label>
                            <Input value={storeNote} onChange={(e: any) => setStoreNote(e.target.value)} placeholder="จุดสังเกต" />
                          </div>
                        </div>

                        <div className="flex gap-2 bg-gray-100 p-2.5 rounded-lg shadow-inner">
                          <div className="flex-1">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-0.5">Lat</label>
                            <input type="text" value={storeLat} readOnly className="w-full bg-transparent text-gray-800 text-sm outline-none font-mono" />
                          </div>
                          <div className="flex-1 border-l border-gray-300 pl-3">
                            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-0.5">Lon</label>
                            <input type="text" value={storeLon} readOnly className="w-full bg-transparent text-gray-800 text-sm outline-none font-mono" />
                          </div>
                        </div>
                      </div>

                      <Button onClick={saveStore} className="w-full py-6 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-lg gap-2">
                        <i className="ph-bold ph-floppy-disk text-xl"></i> บันทึกข้อมูล
                      </Button>
                    </div>
                  </Card>

                  <div>
                    <h2 className="font-bold mb-3 text-gray-700 flex items-center justify-between text-base px-1">
                      <span>ร้านค้าในระบบ</span>
                      <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{stores.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {stores.length === 0 ? (
                        <div className="text-sm text-gray-400 text-center py-6 bg-white rounded-xl">ยังไม่มีข้อมูล</div>
                      ) : (
                        stores.map((store) => (
                          <Card key={store.id} className="p-3 hover:shadow-md transition-shadow border-0 ring-1 ring-gray-100">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 cursor-pointer" onClick={() => focusMap(store.lat, store.lon)}>
                                <div className="text-sm font-bold text-gray-800">{store.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{store.phone || 'ไม่มีเบอร์โทร'}</div>
                              </div>
                              <Button onClick={() => deleteStore(store.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full shrink-0">
                                <i className="ph-bold ph-trash"></i>
                              </Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Card className="p-4 shadow-sm border-0 ring-1 ring-gray-100 shrink-0">
                    <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-base">
                      <i className="ph-fill ph-magnifying-glass text-emerald-600"></i> ค้นหาร้านที่ต้องการไปส่ง
                    </h2>
                    <Input value={searchInput} onChange={(e: any) => setSearchInput(e.target.value)} placeholder="พิมพ์ชื่อร้าน..." className="mb-3 bg-gray-50" />
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {availableStores.length === 0 ? (
                        <div className="text-xs text-gray-400 w-full text-center py-2">ไม่มีร้านที่ตรงกับการค้นหา</div>
                      ) : (
                        availableStores.map((store) => (
                          <Button key={store.id} onClick={() => addToRoute(store.id)} size="sm" variant="outline" className="gap-1 text-gray-700 bg-white">
                            <i className="ph-bold ph-plus"></i> <span className="truncate max-w-[120px]">{store.name}</span>
                          </Button>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="flex-1 flex flex-col shadow-sm overflow-hidden border-0 ring-1 ring-emerald-500/20">
                    <div className="p-3 border-b border-gray-100 bg-emerald-50/50 flex justify-between items-center shrink-0">
                      <h2 className="font-bold text-emerald-800 flex items-center gap-2 text-sm">
                        <i className="ph-fill ph-list-numbers text-lg"></i> ลำดับคิวส่ง ({routeQueue.length})
                      </h2>
                    </div>

                    <div className="flex-1 space-y-2 p-3 overflow-y-auto min-h-[200px] bg-slate-50/50">
                      {routeQueue.length === 0 ? (
                        <div className="text-sm text-gray-400 text-center mt-8">ยังไม่ได้เลือกจุดส่งสินค้า</div>
                      ) : (
                        routeQueue.map((id, index) => {
                          const store = stores.find((s) => s.id === id);
                          if (!store) return null;
                          return (
                            <div key={id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
                              <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => focusMap(store.lat, store.lon)}>
                                <div className="text-sm font-bold text-gray-800 truncate">{store.name}</div>
                              </div>
                              <div className="flex gap-1 border-r border-gray-100 pr-1">
                                <button onClick={() => moveRouteUp(index)} disabled={index === 0} className="text-gray-400 hover:text-emerald-600 disabled:opacity-20"><i className="ph-bold ph-caret-up text-lg"></i></button>
                                <button onClick={() => moveRouteDown(index)} disabled={index === routeQueue.length - 1} className="text-gray-400 hover:text-emerald-600 disabled:opacity-20"><i className="ph-bold ph-caret-down text-lg"></i></button>
                              </div>
                              <button onClick={() => removeFromRoute(id)} className="text-red-400 hover:text-red-600 p-1"><i className="ph-bold ph-x text-lg"></i></button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 border-t border-gray-100 bg-white grid grid-cols-3 gap-2 shrink-0">
                      <Button onClick={reverseRoute} size="sm" variant="outline" className="text-xs bg-gray-50"><i className="ph-bold ph-arrows-down-up mr-1"></i> สลับ</Button>
                      <Button onClick={copyRoute} size="sm" variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200"><i className="ph-bold ph-copy mr-1"></i> ก๊อปปี้</Button>
                      <Button onClick={clearRoute} size="sm" variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200"><i className="ph-bold ph-trash mr-1"></i> ล้าง</Button>
                    </div>
                    <div className="p-3 pt-0 bg-white shrink-0 mt-2">
                      <Button onClick={calculateRoute} className="w-full py-5 text-base gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl">
                        <i className="ph-fill ph-path text-xl"></i> วาดเส้นทางบนแผนที่
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="absolute inset-0 z-0">
        <LongdoMap
          className="w-full h-full outline-none"
          initialCenter={{ lat: 13.7563, lon: 100.5018 }}
          initialZoom={13}
          onMapReady={(map) => { mapRef.current = map; }}
          onClick={(event) => {
            if (isMapPickingMode) {
              setStoreLat(event.lat.toFixed(6));
              setStoreLon(event.lon.toFixed(6));
              setIsMapPickingMode(false);
              setIsPanelOpen(true);
              toast.success('พิกัดถูกตั้งแล้ว');
            }
          }}
        />
      </main>

    </div>
  );
}
