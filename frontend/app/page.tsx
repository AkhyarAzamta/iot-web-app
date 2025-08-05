// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DemoSensorCharts } from '@/components/demo-sensor-charts'; // Import komponen baru
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [waterData, setWaterData] = useState({
    temperature: 26.5,
    ph: 7.2,
    turbidity: 15,
    oxygen: 8.2,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'pH level approaching threshold', time: '2 hours ago' },
    { id: 2, type: 'critical', message: 'Low oxygen level detected', time: '30 minutes ago' },
  ]);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWaterData(prev => ({
        temperature: Math.max(20, Math.min(30, prev.temperature + (Math.random() - 0.5))),
        ph: Math.max(6.5, Math.min(8.5, prev.ph + (Math.random() - 0.5) * 0.1)),
        turbidity: Math.max(5, Math.min(50, prev.turbidity + (Math.random() - 0.5) * 2)),
        oxygen: Math.max(5, Math.min(10, prev.oxygen + (Math.random() - 0.5) * 0.2)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Sample data for charts
  const chartData = [
    { time: '00:00', temperature: 25.4, ph: 7.0, turbidity: 18, oxygen: 7.8 },
    { time: '04:00', temperature: 25.2, ph: 7.1, turbidity: 17, oxygen: 7.9 },
    { time: '08:00', temperature: 25.8, ph: 7.3, turbidity: 14, oxygen: 8.1 },
    { time: '12:00', temperature: 26.5, ph: 7.2, turbidity: 15, oxygen: 8.2 },
    { time: '16:00', temperature: 26.8, ph: 7.1, turbidity: 16, oxygen: 8.0 },
    { time: '20:00', temperature: 26.0, ph: 7.0, turbidity: 17, oxygen: 7.9 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 shadow-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="ml-2 text-xl font-bold text-gray-800 dark:text-white">AquaTrack</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">How It Works</a>
                <a href="#dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
                <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Pricing</a>
                <Button variant="outline" className="text-blue-600 border-blue-600">Login</Button>
                <Button>Sign Up</Button>
              </div>
            </div>
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-800 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600">Features</a>
              <a href="#how-it-works" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600">How It Works</a>
              <a href="#dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
              <a href="#pricing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600">Pricing</a>
              <div className="flex space-x-2 px-3 py-2">
                <Button variant="outline" className="w-full text-blue-600 border-blue-600">Login</Button>
                <Button className="w-full">Sign Up</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-3">
          <div className="md:flex items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">Smart Water Quality Monitoring for Your Pond</h1>
              <p className="text-xl mb-8 text-blue-100">Real-time monitoring of pH, temperature, turbidity and TDS levels using IoT technology.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 transition duration-300">Get Started</Button>
                <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-blue-600 transition duration-300">Learn More</Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                <h3 className="font-bold text-lg mb-4 text-white">Current Water Status</h3>
                <DemoSensorCharts />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Advanced Monitoring Features</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Comprehensive tools to keep your aquatic environment healthy and thriving</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Real-Time Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">Continuous monitoring of water parameters with instant notifications for any critical changes.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Historical Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">Track changes over time with detailed historical charts and customizable reporting.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Mobile Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">Get push notifications on your phone when water parameters go beyond safe thresholds.</p>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Predictive Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">AI-powered predictions to anticipate water quality issues before they occur.</p>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Maintenance Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">Automated reminders for filter changes, water testing, and system maintenance.</p>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-5px] transition-all duration-300">
              <CardHeader>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <CardTitle className="text-xl">Secure Cloud Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">All your data is securely stored in the cloud with end-to-end encryption.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section id="dashboard" className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Interactive Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Monitor and analyze your water quality from anywhere</p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Temperature</CardTitle>
                        <div className={`w-3 h-3 rounded-full ${waterData.temperature > 28 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{waterData.temperature.toFixed(1)}°C</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ideal: 22-28°C</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">pH Level</CardTitle>
                        <div className={`w-3 h-3 rounded-full ${waterData.ph < 6.8 || waterData.ph > 7.8 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{waterData.ph.toFixed(1)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ideal: 6.8-7.8</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Turbidity</CardTitle>
                        <div className={`w-3 h-3 rounded-full ${waterData.turbidity > 30 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{waterData.turbidity.toFixed(1)} NTU</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ideal: &lt; 30 NTU</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Oxygen</CardTitle>
                        <div className={`w-3 h-3 rounded-full ${waterData.oxygen < 6 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{waterData.oxygen.toFixed(1)} mg/L</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ideal: &gt; 6 mg/L</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="temperature" stroke="#0ea5e9" name="Temperature (°C)" />
                      <Line type="monotone" dataKey="ph" stroke="#10b981" name="pH Level" />
                      <Line type="monotone" dataKey="turbidity" stroke="#f59e0b" name="Turbidity (NTU)" />
                      <Line type="monotone" dataKey="oxygen" stroke="#3b82f6" name="Oxygen (mg/L)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="h-80">
                    <h3 className="text-lg font-semibold mb-4">Daily Averages</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="temperature" fill="#0ea5e9" name="Temperature (°C)" />
                        <Bar dataKey="oxygen" fill="#3b82f6" name="Oxygen (mg/L)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="h-80">
                    <h3 className="text-lg font-semibold mb-4">Water Quality Index</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={chartData.map(d => ({ time: d.time, wqi: (d.temperature/2 + d.ph*5 + (50-d.turbidity)/2 + d.oxygen*5) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="wqi" stroke="#8b5cf6" name="Water Quality Index" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="alerts">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Active Alerts</h3>
                  <Button variant="outline">Configure Alerts</Button>
                </div>
                
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border ${
                        alert.type === 'critical' 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${alert.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                          <span className="font-medium">{alert.message}</span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{alert.time}</span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                        <span className="font-medium">All systems operating normally</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">How AquaTrack Works</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Simple setup for advanced water quality monitoring</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">1</div>
                  <CardTitle className="text-lg">Install Sensors</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">Place our waterproof sensors in your pond or aquarium. No wiring needed - all sensors communicate wirelessly.</p>
              </CardContent>
            </Card>
            
            <Card className="transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">2</div>
                  <CardTitle className="text-lg">Connect to Hub</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">The central hub receives data from all sensors and sends it to our cloud platform via WiFi or cellular.</p>
              </CardContent>
            </Card>
            
            <Card className="transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">3</div>
                  <CardTitle className="text-lg">Monitor & Act</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">View real-time data and receive alerts through our web dashboard or mobile app.</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 p-8">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Fast Installation, Instant Insights</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Our system requires minimal setup time. Typically you can have everything running in under 30 minutes, with data flowing to your dashboard immediately.</p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">No technical expertise required</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt:0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">Works with both freshwater and saltwater environments</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt:0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">Sensors last 6+ months on a single battery charge</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-cyan-500 to-blue-500 min-h-[300px] flex items-center justify-center">
                <div className="text-white text-center p-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="text-xl font-bold mb-2">Try Our Virtual Demo</h3>
                  <p className="mb-4">Experience the AquaTrack dashboard with simulated data</p>
                  <Button variant="secondary">Launch Demo Dashboard</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Water Monitoring?</h2>
          <p className="text-xl text-cyan-100 max-w-3xl mx-auto mb-10">Join thousands of aquaculture professionals and hobbyists who trust AquaTrack for their water quality management.</p>
          
          <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Get Started Today</h3>
            <div className="space-y-4">
              <Input type="email" placeholder="Your email address" className="dark:bg-slate-700 dark:text-white" />
              <Input type="text" placeholder="Your name" className="dark:bg-slate-700 dark:text-white" />
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
              <p className="text-sm text-gray-500 dark:text-gray-400">14-day free trial • No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="ml-2 text-xl font-bold">AquaTrack</span>
              </div>
              <p className="text-slate-300 mb-4">Smart water quality monitoring for aquaculture professionals and enthusiasts.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-300 hover:text-white">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="#" className="text-slate-300 hover:text-white">
                  <i className="fab fa-linkedin-in"></i>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">Features</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Solutions</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Guides</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">API Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">About Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Partners</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">© 2023 AquaTrack. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white text-sm">Privacy Policy</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Terms of Service</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}