"use client"

import { useEffect, useState, use } from 'react'
import { db } from '@/lib/firebaseClient'
import { ref, onValue, off } from 'firebase/database'

import { GoogleMap, LoadScript, OverlayView } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '100%'
};

export default function TrackPage({ params }) {
    // Determine token based on Next 15 Promise unwrapping logic if necessary
    const resolvedParams = use(params)
    const token = resolvedParams?.token
    
    const [status, setStatus] = useState('loading') // loading, active, inactive, not_found
    const [location, setLocation] = useState(null)
    const [address, setAddress] = useState('Resolving location name...')
    const [riderProfile, setRiderProfile] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)

    useEffect(() => {
        if (!token || !db) return;

        const locationRef = ref(db, `locations/${token}`)
        
        const listener = onValue(locationRef, (snapshot) => {
            const data = snapshot.val()
            
            if (!data) {
                setStatus('not_found')
                return
            }

            if (data.status === 'inactive') {
                setStatus('inactive')
                return
            }

            setStatus('active')
            if (data.profile_picture) {
                setRiderProfile(data.profile_picture)
            }
            if (data.latitude && data.longitude) {
                setLocation((prev) => {
                    // Only trigger update if location actually changed to avoid spamming Geocoding API
                    if (!prev || prev.lat !== data.latitude || prev.lng !== data.longitude) {
                        return { lat: data.latitude, lng: data.longitude }
                    }
                    return prev;
                })
                setLastUpdated(data.updated_at)
            }
        }, (error) => {
            console.error("Firebase error: ", error)
            setStatus('error')
        })

        return () => {
            off(locationRef, 'value', listener)
        }
    }, [token])

    // Reverse Geocoding Effect
    useEffect(() => {
        if (!location) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
           setAddress(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`)
           return;
        }

        const fetchAddress = async () => {
            try {
                const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${apiKey}`)
                const data = await res.json()
                if (data.results && data.results.length > 0) {
                    // Grab the most relevant street address
                    setAddress(data.results[0].formatted_address)
                } else {
                    setAddress(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`)
                }
            } catch (err) {
                console.error("Geocoding failed:", err)
                setAddress(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`)
            }
        }

        fetchAddress()
    }, [location])

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        )
    }

    if (status === 'not_found' || status === 'error') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Invalid</h2>
                    <p className="text-gray-500">This tracking link does not exist or has expired.</p>
                </div>
            </div>
        )
    }

    if (status === 'inactive') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Ended</h2>
                    <p className="text-gray-500">The rider has stopped sharing their live location.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm p-4 z-10 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-lg text-gray-800">Live Ride Tracking</h1>
                    {lastUpdated && (
                        <p className="text-xs text-gray-500">
                            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-green-600">Live</span>
                </div>
            </div>

            {/* Map Placeholder */}
            {/* Note: In a real app, wrap this with GoogleMap or Leaflet components */}
            <div className="flex-1 relative bg-gray-200 flex flex-col items-center justify-center overflow-hidden">
                {!location ? (
                    <div className="text-center p-6 text-gray-500 space-y-4">
                        <div className="animate-bounce">
                            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <p>Waiting for rider's GPS signal...</p>
                    </div>
                ) : (
                    <div className="w-full h-full">
                        <div className="absolute inset-0 z-0">
                            <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY"}>
                                <GoogleMap
                                    mapContainerStyle={containerStyle}
                                    center={{ lat: location.lat, lng: location.lng }}
                                    zoom={15}
                                    options={{ disableDefaultUI: true, zoomControl: true }}
                                >
                                    <OverlayView
                                        position={{ lat: location.lat, lng: location.lng }}
                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                        getPixelPositionOffset={(width, height) => ({
                                            x: -(width / 2),
                                            y: -height
                                        })}
                                    >
                                        <div className="relative flex flex-col items-center cursor-pointer group">
                                            {/* Animated subtle 3D Pulse beneath the pin */}
                                            <div className="absolute -bottom-1 w-8 h-3 bg-black/20 rounded-[100%] blur-[2px] animate-pulse"></div>
                                            
                                            {/* Main Pin Body */}
                                            <div className="relative flex flex-col items-center transform transition-transform duration-300 group-hover:-translate-y-2">
                                                
                                                {/* Circular Avatar Container with 3D Ring */}
                                                <div className="w-14 h-14 rounded-full p-[3px] bg-gradient-to-br from-green-400 via-green-500 to-green-700 shadow-[0_8px_16px_rgba(0,0,0,0.25),inset_0__rgba(255,255,255,0.8)] relative z-10">
                                                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                                                        <img 
                                                            src={riderProfile ? riderProfile : 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'} 
                                                            alt="Rider" 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Sharpened 3D Cone Pointer */}
                                                <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-green-600 relative -mt-1 z-0 filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)]"></div>
                                            </div>
                                        </div>
                                    </OverlayView>
                                </GoogleMap>
                            </LoadScript>
                        </div>
                        
                        {/* Overlay Data Box */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm px-4">
                           <div className="bg-white/95 backdrop-blur p-4 rounded-2xl shadow-xl text-center border border-gray-100">
                               <h3 className="text-lg font-bold text-gray-800 mb-1">Rider Location</h3>
                               <p className="text-gray-600 font-medium text-sm bg-gray-100 px-3 py-2 rounded-md inline-block max-w-full truncate">
                                   {address}
                               </p>
                           </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
