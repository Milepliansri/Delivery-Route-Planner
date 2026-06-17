import React, { useEffect, useRef, useState } from 'react';

const Button = ({ children, className = '', variant = 'default', size = 'default', ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900",
    ghost: "hover:bg-gray-100 hover:text-gray-900 text-gray-700"
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
        
        // บังคับให้แผนที่จัดเรียงตัวเองใหม่เมื่อโหลดเสร็จ
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
    if (mapRef.current && mapRef.current.focusLocation) {
      mapRef.current.focusLocation(lat, lon, 16);
    }
  };

  const availableStores = stores.filter(
    (s) =>
      !routeQueue.includes(s.id) &&
      (s.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        (s.note && s.note.toLowerCase().includes(searchInput.toLowerCase())))
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans">
      
      {/* Toasts Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 transform transition-all duration-300 ${t.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
            <i className={`ph-bold ${t.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-xl`}></i>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Map Area (บังคับความสูง 45vh บนมือถือ ให้พอดีกับการใช้งาน) */}
      <main className="w-full h-[45vh] md:flex-1 md:h-screen relative bg-gray-200 order-first md:order-last shrink-0 z-0 border-b border-gray-300 md:border-none">
        <LongdoMap
          className="absolute inset-0 w-full h-full outline-none"
          initialCenter={{ lat: 13.7563, lon: 100.5018 }}
          initialZoom={13}
          onMapReady={(map) => { mapRef.current = map; }}
          onClick={(event) => {
            if (isMapPickingMode) {
              setStoreLat(event.lat.toFixed(6));
              setStoreLon(event.lon.toFixed(6));
              setIsMapPickingMode(false);
              toast.success('พิกัดถูกตั้งแล้ว');
            }
          }}
        />

        {isMapPickingMode && (
          <div className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2.5 rounded-lg shadow-lg z-40 flex items-center gap-2 animate-pulse font-medium">
            <i className="ph-fill ph-crosshair text-xl"></i> คลิกบนแผนที่เพื่อตั้งค่าพิกัด
          </div>
        )}
      </main>

      {/* Sidebar / ควบคุมระบบ */}
      <aside className="w-full md:w-[450px] bg-white shadow-2xl flex flex-col flex-1 md:h-screen md:overflow-hidden z-10 shrink-0 border-r border-gray-200">
        <div className="p-4 md:p-5 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white flex justify-between items-center shadow-inner shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 tracking-tight">
              <i className="ph-fill ph-map-trifold"></i> Route Planner Pro
            </h1>
            <p className="text-xs md:text-sm text-indigo-100 mt-1 opacity-90">ระบบบริหารจุดจัดส่งและแกะพิกัดอัจฉริยะ</p>
          </div>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 shadow-sm">
          <button onClick={() => setActiveTab('stores')} className={`flex-1 py-3.5 font-bold text-sm transition-all flex justify-center items-center gap-2 border-b-[3px] ${activeTab === 'stores' ? 'text-indigo-700 bg-indigo-50 border-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100 border-transparent'}`}>
            <i className="ph-bold ph-storefront text-lg"></i> ฐานข้อมูลร้านค้า
          </button>
          <button onClick={() => setActiveTab('route')} className={`flex-1 py-3.5 font-bold text-sm transition-all flex justify-center items-center gap-2 border-b-[3px] ${activeTab === 'route' ? 'text-indigo-700 bg-indigo-50 border-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100 border-transparent'}`}>
            <i className="ph-bold ph-routing text-lg"></i> จัดเส้นทางส่งของ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-6 bg-gray-50/50 pb-24 md:pb-5">
          {activeTab === 'stores' ? (
            <>
              <Card className="p-4 md:p-5 shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2 text-indigo-700 text-lg">
                  <i className="ph-fill ph-map-pin-plus"></i> เพิ่มจุดส่งสินค้าใหม่
                </h2>
                <div className="space-y-4">
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                    <label className="block text-sm font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                      <i className="ph-bold ph-link text-indigo-600"></i> วางลิงก์ Google Maps เพื่อดึงพิกัด
                    </label>
                    <div className="flex flex-col gap-2">
                      <Input value={storeLink} onChange={(e: any) => setStoreLink(e.target.value)} placeholder="เช่น https://maps.app.goo.gl/..." />
                      <Button onClick={extractCoordsFromLink} className="w-full gap-2 font-bold">
                        <i className="ph-bold ph-magic-wand text-lg"></i> ถอดรหัสพิกัดอัตโนมัติ
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <hr className="flex-1 border-gray-300" /><span className="text-xs text-gray-400 font-semibold tracking-wider">หรือกรอกข้อมูลเอง</span><hr className="flex-1 border-gray-300" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อลูกค้า / ร้านค้า <span className="text-red-500">*</span></label>
                      <Input value={storeName} onChange={(e: any) => setStoreName(e.target.value)} placeholder="ระบุชื่อสถานที่" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">เบอร์โทรติดต่อ</label>
                        <Input value={storePhone} onChange={(e: any) => setStorePhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">รายละเอียด</label>
                        <Input value={storeNote} onChange={(e: any) => setStoreNote(e.target.value)} placeholder="จุดสังเกต" />
                      </div>
                    </div>

                    <Button onClick={() => setIsMapPickingMode(!isMapPickingMode)} variant="outline" className={`w-full font-semibold gap-2 ${isMapPickingMode ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200' : 'border-blue-200 text-blue-700'}`}>
                      <i className="ph-bold ph-crosshair text-lg"></i> {isMapPickingMode ? 'กำลังเลือกจุดบนแผนที่ (คลิกที่แผนที่ด้านบน)' : 'จิ้มเลือกลงบนแผนที่ด้วยตัวเอง'}
                    </Button>

                    <div className="flex gap-2 bg-gray-100 p-2.5 rounded-md border border-gray-200 shadow-inner">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Lat</label>
                        <input type="text" value={storeLat} readOnly className="w-full bg-transparent text-gray-800 text-sm outline-none font-mono" />
                      </div>
                      <div className="flex-1 border-l border-gray-300 pl-3">
                        <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Lon</label>
                        <input type="text" value={storeLon} readOnly className="w-full bg-transparent text-gray-800 text-sm outline-none font-mono" />
                      </div>
                    </div>
                  </div>

                  <Button onClick={saveStore} className="w-full py-6 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-lg shadow-lg gap-2">
                    <i className="ph-bold ph-floppy-disk text-xl"></i> บันทึกข้อมูลลงฐานข้อมูล
                  </Button>
                </div>
              </Card>

              <div>
                <h2 className="font-bold mb-3 text-gray-700 flex items-center justify-between text-lg px-1">
                  <span>รายชื่อจุดจัดส่งในระบบ</span>
                  <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full shadow-sm">{stores.length}</span>
                </h2>
                <div className="space-y-3 pb-6">
                  {stores.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                      <i className="ph ph-package text-4xl mb-2 text-gray-300 block"></i>ยังไม่มีข้อมูลร้านค้า
                    </div>
                  ) : (
                    stores.map((store) => (
                      <Card key={store.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 cursor-pointer hover:text-indigo-700 transition-colors" onClick={() => focusMap(store.lat, store.lon)}>
                            <div className="text-sm font-bold text-gray-800">{store.name}</div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              {store.phone && <span className="flex items-center gap-1"><i className="ph-fill ph-phone text-indigo-400"></i>{store.phone}</span>}
                              {store.note && <span className="text-orange-500">{store.note}</span>}
                            </div>
                          </div>
                          <Button onClick={() => deleteStore(store.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full">
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
              <Card className="p-4 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="ph-fill ph-magnifying-glass text-indigo-600 text-lg"></i> ค้นหาเพื่อเพิ่มเข้าเส้นทาง
                </h2>
                <div className="relative mb-3">
                  <i className="ph-bold ph-magnifying-glass absolute left-3 top-3 text-gray-400 text-lg"></i>
                  <Input value={searchInput} onChange={(e: any) => setSearchInput(e.target.value)} placeholder="พิมพ์ชื่อร้านเพื่อค้นหา..." className="pl-10" />
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {availableStores.length === 0 ? (
                    <div className="text-xs text-gray-400 w-full text-center py-3 bg-gray-50 rounded border border-gray-100">ไม่มีร้านที่ตรงกับการค้นหา</div>
                  ) : (
                    availableStores.map((store) => (
                      <Button key={store.id} onClick={() => addToRoute(store.id)} size="sm" variant="outline" className="gap-1.5 shrink-0 text-gray-700 border-gray-300 hover:border-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        <i className="ph-fill ph-plus-circle text-indigo-500"></i> <span className="truncate max-w-[140px]">{store.name}</span>
                      </Button>
                    ))
                  )}
                </div>
              </Card>

              <Card className="flex-1 flex flex-col shadow-sm overflow-hidden border-indigo-100">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="ph-fill ph-list-numbers text-indigo-600 text-xl"></i> ลำดับคิวจัดส่ง
                  </h2>
                  <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full">{routeQueue.length} จุด</span>
                </div>

                <div className="flex-1 space-y-2 p-3 overflow-y-auto min-h-[200px] bg-slate-50">
                  {routeQueue.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center mt-12 py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                      <i className="ph ph-truck text-5xl mb-2 text-gray-200 block"></i>
                      ยังไม่ได้เลือกจุดส่งสินค้า
                    </div>
                  ) : (
                    routeQueue.map((id, index) => {
                      const store = stores.find((s) => s.id === id);
                      if (!store) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm hover:border-indigo-300 transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</div>
                          <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => focusMap(store.lat, store.lon)}>
                            <div className="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-700">{store.name}</div>
                            {store.phone && <div className="text-xs text-gray-500 mt-0.5 truncate">{store.phone}</div>}
                          </div>
                          <div className="flex flex-col gap-1 pr-2 border-r border-gray-100">
                            <button onClick={() => moveRouteUp(index)} disabled={index === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20"><i className="ph-bold ph-caret-up text-lg"></i></button>
                            <button onClick={() => moveRouteDown(index)} disabled={index === routeQueue.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20"><i className="ph-bold ph-caret-down text-lg"></i></button>
                          </div>
                          <Button onClick={() => removeFromRoute(id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-white hover:bg-red-500 rounded-full">
                            <i className="ph-bold ph-minus text-lg"></i>
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-white grid grid-cols-3 gap-2 shrink-0">
                  <Button onClick={reverseRoute} size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1 text-xs">
                    <i className="ph-bold ph-arrows-down-up text-lg"></i> สลับไป-กลับ
                  </Button>
                  <Button onClick={copyRoute} size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1 text-xs text-blue-700 border-blue-200 hover:bg-blue-50">
                    <i className="ph-bold ph-copy text-lg"></i> คัดลอก
                  </Button>
                  <Button onClick={clearRoute} size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50">
                    <i className="ph-bold ph-trash text-lg"></i> ล้าง
                  </Button>
                </div>
                <div className="p-3 pt-0 bg-white shrink-0">
                  <Button onClick={calculateRoute} className="w-full py-6 text-base gap-2 font-bold shadow-md">
                    <i className="ph-fill ph-path text-xl"></i> คำนวณเส้นทางและวาดแผนที่
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </aside>

    </div>
  );
}
