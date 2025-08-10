/* eslint-disable @typescript-eslint/no-explicit-any */
// components/demo-analytics.tsx
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Calendar, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { LoadingSpinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreDevice } from "@/hooks/use-store-modal"; // tetap gunakan store device agar tampilan sama

// Recharts + date-fns (digunakan oleh DemoSensorCharts)
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import { useI18n } from '@/lib/i18n'; // Pastikan path sesuai proyek


type DemoSensorData = {
  id: string;
  createdAt: string; // ISO
  temperature: number;
  turbidity: number;
  tds: number;
  ph: number;
  deviceId?: string;
};

function generateDemoData(count = 123, deviceId?: string) {
  const now = Date.now();
  const arr: DemoSensorData[] = [];
  for (let i = 0; i < count; i++) {
    const ts = new Date(now - (count - i) * 5 * 60 * 1000); // setiap 5 menit
    arr.push({
      id: `demo-${i}`,
      createdAt: ts.toISOString(),
      temperature: +(22 + Math.sin(i / 3) * 3 + (Math.random() - 0.5)).toFixed(2),
      turbidity: +(10 + Math.abs(Math.sin(i / 4) * 20) + (Math.random() - 0.5) * 2).toFixed(2),
      tds: Math.round(800 + Math.abs(Math.sin(i / 6) * 600) + (Math.random() - 0.5) * 50),
      ph: +(6.5 + Math.sin(i / 5) * 0.6 + (Math.random() - 0.5) * 0.05).toFixed(2),
      deviceId,
    });
  }
  return arr;
}

// --- helper functions untuk chart demo ---

/**
 * aggregateDailyAverages
 * - Mengambil fullData (array item dengan createdAt + sensor fields)
 * - Mengembalikan rata-rata per hari untuk sensorKey selama `days` hari sampai endDate
 */
function aggregateDailyAverages(
  fullData: DemoSensorData[],
  sensorKey: keyof DemoSensorData | string,
  days = 7,
  endDate = new Date()
) {
  const startDate = subDays(endDate, days - 1);

  // group by yyyy-MM-dd
  const grouped: Record<string, { sum: number; count: number }> = {};
  for (const item of fullData) {
    if (!item.createdAt) continue;
    const d = new Date(item.createdAt);
    if (d < startDate || d > endDate) continue;
    const key = format(d, "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
    const val = (item as any)[sensorKey];
    if (typeof val === "number" && !isNaN(val)) {
      grouped[key].sum += val;
      grouped[key].count += 1;
    }
  }

  // build full list of dates (inclusive)
  const out: { timestamp: string; value: number | null }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = format(date, "yyyy-MM-dd");
    if (grouped[key] && grouped[key].count > 0) {
      out.push({ timestamp: key, value: grouped[key].sum / grouped[key].count });
    } else {
      out.push({ timestamp: key, value: null });
    }
  }
  return out;
}

/**
 * generateSyntheticDaily
 * - Menghasilkan nilai sintetis yang "terus" (smoothed) agar chart terlihat realistik
 * - Nilai di-clamp ke rentang yang masuk akal per sensor
 */
function generateSyntheticDaily(
  sensorKey: string,
  days = 7,
  endDate = new Date()
) {
  // rentang nilai per sensor
  const ranges: Record<string, [number, number, number]> = {
    temperature: [22, 30, 0.6], // [min, max, daily-jitter]
    turbidity: [5, 50, 3],
    tds: [800, 2000, 60],
    ph: [6.0, 8.5, 0.15],
  };

  const cfg = ranges[sensorKey] ?? [0, 100, 5];
  const [min, max, jitter] = cfg;
  const startDate = subDays(endDate, days - 1);

  // pick initial value in range
  let prev = min + Math.random() * (max - min);

  const out: { timestamp: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // small random walk
    const delta = (Math.random() - 0.5) * jitter * 2;
    let val = prev + delta;

    // occasionally larger excursion to look natural
    if (Math.random() < 0.05) {
      val += (Math.random() - 0.5) * (jitter * 8);
    }

    // clamp
    val = Math.max(min, Math.min(max, val));
    prev = val;

    out.push({ timestamp: format(date, "yyyy-MM-dd"), value: parseFloat(val.toFixed(2)) });
  }

  return out;
}

/** Columns — meniru struktur aslinya (pakai DemoSensorData tipe) */


/**
 * DemoSensorCharts
 * - menerima `data` (full dataset)
 * - menampilkan AreaChart yang meng-aggregate rata-rata per hari
 * - pilihan sensor dan pilihan rentang (7/14/30 hari)
 */
function DemoSensorCharts({
  data,
  t
}: {
  data: DemoSensorData[];
  t: (key: string, fallback?: string, params?: Record<string, any>) => string
}) {
  // Gunakan terjemahan untuk label sensor
  const SENSOR_OPTIONS = [
    { key: "temperature", label: t('sensor.temperature'), color: "#FF6384", unit: "°C" },
    { key: "turbidity", label: t('sensor.turbidity'), color: "#36A2EB", unit: "%" },
    { key: "tds", label: t('sensor.tds'), color: "#4BC0C0", unit: "ppm" },
    { key: "ph", label: t('sensor.ph'), color: "#8b5cf6", unit: "" },
  ] as const;

  const [timeRange, setTimeRange] = React.useState<"7d" | "14d" | "30d">("7d");
  const [selectedSensor, setSelectedSensor] = React.useState<string>("temperature");
  const [chartData, setChartData] = React.useState<{ timestamp: string; value: number | null }[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      const days = timeRange === "14d" ? 14 : timeRange === "30d" ? 30 : 7;
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);

      // group by date
      const grouped: Record<string, { sum: number; count: number }> = {};

      data.forEach((item) => {
        if (!item.createdAt) return;
        const d = new Date(item.createdAt);
        // ignore points outside range
        if (d < startDate || d > endDate) return;
        const key = format(d, "yyyy-MM-dd");
        if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };

        const val = (item as any)[selectedSensor];
        if (typeof val === "number" && !isNaN(val)) {
          grouped[key].sum += val;
          grouped[key].count += 1;
        }
      });

      // build all dates array (inclusive)
      const totalDays = days;
      const allDates: string[] = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return format(date, "yyyy-MM-dd");
      });

      const out = allDates.map((dateStr) => {
        if (grouped[dateStr] && grouped[dateStr].count > 0) {
          return { timestamp: dateStr, value: grouped[dateStr].sum / grouped[dateStr].count };
        }
        return { timestamp: dateStr, value: null };
      });

      setChartData(out);
    } catch (err) {
      setError("Failed to prepare chart data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [data, selectedSensor, timeRange]);

  React.useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      const days = timeRange === "14d" ? 14 : timeRange === "30d" ? 30 : 7;
      const aggregated = aggregateDailyAverages(data, selectedSensor, days, new Date());

      // jika ada hari kosong, isi dengan synthetic (tapi hanya untuk hari-hari yang kosong)
      const synthetic = generateSyntheticDaily(selectedSensor, days, new Date());
      const merged = aggregated.map((d, i) => {
        if (d.value === null || typeof d.value !== "number" || isNaN(d.value)) {
          return { timestamp: d.timestamp, value: synthetic[i].value };
        }
        return d;
      });

      setChartData(merged);
    } catch (err) {
      console.error(err);
      setError("Failed to prepare chart data");
    } finally {
      setIsLoading(false);
    }
  }, [data, selectedSensor, timeRange]);

  const currentSensor = SENSOR_OPTIONS.find((s) => s.key === selectedSensor) ?? SENSOR_OPTIONS[0];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-semibold">{t('chart.title')}</h3>
          <p className="text-sm text-gray-500">{t('chart.subtitle')}</p>
        </div>

        <div className="flex gap-4 items-center">
          <div>
            <div className="mb-2 text-sm font-medium">{t('chart.timeRange')}</div>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('chart.timeRange.7d')}</SelectItem>
                <SelectItem value="14d">{t('chart.timeRange.14d')}</SelectItem>
                <SelectItem value="30d">{t('chart.timeRange.30d')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">{t('chart.sensor')}</div>
            <Select value={selectedSensor} onValueChange={(v) => setSelectedSensor(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_OPTIONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="aspect-auto h-[420px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">{t('chart.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-destructive">{t('chart.error')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValueDemo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentSensor.color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={currentSensor.color} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => (currentSensor.unit ? `${value} ${currentSensor.unit}` : `${value}`)}
                />
                <Tooltip
                  formatter={(value: any) => {
                    if (value === null) return [t('chart.tooltip.noData'), currentSensor.label];
                    return [`${Number(value).toFixed(2)}${currentSensor.unit ? ` ${currentSensor.unit}` : ""}`, currentSensor.label];
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={currentSensor.label}
                  stroke={currentSensor.color}
                  fill="url(#colorValueDemo)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  activeDot={{ r: 6, stroke: currentSensor.color, fill: "#fff", strokeWidth: 2 }}
                  dot={{ r: 2, fill: currentSensor.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DemoAnalytics() {
  const { t } = useI18n();
  const activeDevice = useStoreDevice((s) => s.activeDevice);

  // demo full dataset (ke-1 kali render akan tetap sama)
  const [fullData, setFullData] = React.useState<DemoSensorData[]>(
    () => generateDemoData(123, activeDevice?.id)
  );

  // pagination state (mirip aslinya)
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: 10,
    totalPages: Math.max(1, Math.ceil(fullData.length / 10)),
    totalItems: fullData.length,
  });

  // filters / sorting states (dipakai oleh table)
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [timeFilter, setTimeFilter] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  // Derived: slice for current page (server-side pattern kept: we slice manually)
  const getPageData = React.useCallback(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return fullData.slice(start, end);
  }, [fullData, pagination.page, pagination.pageSize]);

  const [data, setData] = React.useState<DemoSensorData[]>(() => getPageData());

  // keep pagination meta updated if fullData changes
  React.useEffect(() => {
    setPagination((p) => ({
      ...p,
      totalPages: Math.max(1, Math.ceil(fullData.length / p.pageSize)),
      totalItems: fullData.length,
      page: Math.min(p.page, Math.max(1, Math.ceil(fullData.length / p.pageSize))),
    }));
  }, [fullData]);

  // update page slice when pagination changes
  React.useEffect(() => {
    setData(getPageData());
  }, [getPageData]);

  const demoColumns: ColumnDef<DemoSensorData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('table.header.selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('table.header.selectAll')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('table.header.timestamp')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        const formatted = new Intl.DateTimeFormat("id-ID", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(date);
        return <div className="text-sm">{formatted}</div>;
      },
    },
    {
      accessorKey: "temperature",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('table.header.temperature')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const temp = parseFloat(row.getValue("temperature") as any);
        return <div className="text-center font-medium">{temp.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: "turbidity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('table.header.turbidity')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const turbidity = parseFloat(row.getValue("turbidity") as any);
        return <div className="text-center font-medium">{turbidity.toFixed(4)}</div>;
      },
    },
    {
      accessorKey: "tds",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('table.header.tds')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const tds = parseFloat(row.getValue("tds") as any);
        return <div className="text-center font-medium">{tds}</div>;
      },
    },
    {
      accessorKey: "ph",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t('table.header.ph')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const ph = parseFloat(row.getValue("ph") as any);
        return <div className="text-center font-medium">{ph.toFixed(2)}</div>;
      },
    },
  ];

  // react-table instance (manualPagination pattern like aslinya)
  const table = useReactTable({
    data,
    columns: demoColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: pagination.totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
    },
  });

  // handlers similar to original
  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    if (value) {
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleDateRangeFilter = () => {
    if (dateFrom || dateTo) setTimeFilter("");
  };

  const clearFilters = () => {
    setTimeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const handleRefresh = () => {
    // simulate refresh by re-generating demo values (but keep same length)
    const newData = generateDemoData(fullData.length, activeDevice?.id);
    setFullData(newData);
    setRowSelection({});
  };

  // delete selected (client-side)
  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((r) => r.original.id);
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    // simulate delay
    await new Promise((res) => setTimeout(res, 500));
    setFullData((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setRowSelection({});
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const openDeleteConfirm = () => {
    if (table.getFilteredSelectedRowModel().rows.length > 0) setShowDeleteConfirm(true);
  };

  // pagination button helpers (mirror original)
  const goToPage = (p: number) => {
    setPagination((prev) => ({ ...prev, page: Math.min(Math.max(1, p), prev.totalPages) }));
  };

  return (
    <div className="flex w-full flex-col gap-6 px-5">
      <Tabs defaultValue="data">
        <TabsList className="w-full">
          <TabsTrigger value="data">{t('analytics.tab.data')}</TabsTrigger>
          <TabsTrigger value="chart">{t('analytics.tab.chart')}</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          {/* Device info */}
          {activeDevice && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm font-medium">
                {t('analytics.deviceInfo', '', {
                  deviceName: activeDevice.deviceName ?? "Demo Device",
                  deviceId: activeDevice.id
                })}
              </p>
            </div>
          )}
          {!activeDevice && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                {t('analytics.noDevice')}
              </p>
            </div>
          )}

          {/* Filters / controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">{t('analytics.filter')}</span>
            </div>

            <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('analytics.filter.period')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('analytics.filter.today')}</SelectItem>
                <SelectItem value="week">{t('analytics.filter.last7')}</SelectItem>
                <SelectItem value="month">{t('analytics.filter.last30')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm">{t('analytics.filter.or')}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Input
                type="date"
                placeholder={t('analytics.filter.from')}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onBlur={handleDateRangeFilter}
                className="w-[150px]"
              />
              <span className="text-sm">{t('analytics.filter.to')}</span>
              <Input
                type="date"
                placeholder={t('analytics.filter.to')}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onBlur={handleDateRangeFilter}
                className="w-[150px]"
              />
            </div>

            <Button variant="outline" onClick={clearFilters}>
              {t('analytics.filter.clear')}
            </Button>

            {table.getFilteredSelectedRowModel().rows.length > 0 ? (
              <Button variant="destructive" onClick={openDeleteConfirm} disabled={isDeleting}>
                {t('analytics.deleteSelected')}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleRefresh} disabled={isDeleting}>
                {isDeleting ? <LoadingSpinner /> : t('analytics.refresh')}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  {t('analytics.columns')} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {isDeleting ? (
                  <TableRow>
                    <TableCell colSpan={demoColumns.length} className="h-24 text-center">
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={demoColumns.length} className="h-24 text-center">
                      {t('analytics.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">{t('analytics.rowsPerPage')}</p>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(v) => {
                  const ps = Number(v);
                  setPagination((prev) => ({ ...prev, pageSize: ps, page: 1, totalPages: Math.max(1, Math.ceil(fullData.length / ps)) }));
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((s) => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {t('analytics.pageInfo', '', {
                    page: pagination.page,
                    totalPages: pagination.totalPages
                  })}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(1)} disabled={pagination.page === 1}>
                  {"<<"}
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}>
                  {"<"}
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                  {">"}
                </Button>
                <Button variant="outline" className="h-8 w-8 p-0" onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages}>
                  {">>"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chart">
          {/* Use the internal demo charts */}
          <DemoSensorCharts data={fullData} t={t} />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md border border-gray-200">
            <h3 className="text-lg font-medium mb-4">
              {t('analytics.deleteConfirm.title')}
            </h3>
            <p className="mb-4 text-gray-700">
              {t('analytics.deleteConfirm.message', '', {
                count: table.getFilteredSelectedRowModel().rows.length
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-gray-300">
                {t('analytics.deleteConfirm.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? <LoadingSpinner /> : t('analytics.deleteConfirm.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
