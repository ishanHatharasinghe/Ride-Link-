import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro"; // Changed from 'html2canvas' to 'html2canvas-pro'
import "jspdf-autotable";
import {
  Bus,
  Calendar,
  Download,
  Share2,
  FileText,
  TrendingUp,
  Clock,
  Users,
  MapPin,
  BarChart3,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet
} from "lucide-react";

interface PassengerData {
  busId: string;
  timestamp: string;
  originalTimestamp: string;
  count: number;
}

interface BusData {
  busId: string;
  routeId: string;
  ownerId: string;
  status?: string;
  passengers?: { [key: string]: number };
}

interface ReportFilters {
  type: "daily" | "monthly" | "yearly";
  date?: string;
  month?: string;
  year?: string;
}

interface ReportsSectionProps {
  passengers: PassengerData[];
  buses: BusData[];
  ownerData: any;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({
  passengers,
  buses,
  ownerData
}) => {
  const [filters, setFilters] = useState<ReportFilters>({ type: "daily" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Helper function to parse custom timestamp
  const parseCustomTimestamp = (timestamp: string): Date | null => {
    try {
      const formattedTimestamp = timestamp.replace(/_/g, ":");
      const date = new Date(formattedTimestamp);

      if (isNaN(date.getTime())) {
        const match = timestamp.match(
          /^(\d{4})-(\d{2})-(\d{2})T(\d{2})_(\d{2})_(\d{2})_(\d{3})Z$/
        );
        if (match) {
          const [_, year, month, day, hour, minute, second, millisecond] =
            match;
          return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second),
            parseInt(millisecond)
          );
        }
      }
      return date;
    } catch (error) {
      console.error("Error parsing timestamp:", timestamp, error);
      return null;
    }
  };

  // Generate report data based on filters
  const generateReportData = () => {
    const { type, date, month, year } = filters;

    switch (type) {
      case "daily":
        return generateDailyReport(
          date || new Date().toISOString().split("T")[0]
        );
      case "monthly":
        return generateMonthlyReport(
          month ||
            `${new Date().getFullYear()}-${String(
              new Date().getMonth() + 1
            ).padStart(2, "0")}`
        );
      case "yearly":
        return generateYearlyReport(
          year || new Date().getFullYear().toString()
        );
      default:
        return [];
    }
  };

  // Generate daily report
  const generateDailyReport = (selectedDate: string) => {
    const targetDate = new Date(selectedDate);
    const dailyData: any[] = [];

    // Group passengers by hour
    const hourlyData = new Map<number, number>();

    passengers.forEach((passenger) => {
      const date = parseCustomTimestamp(passenger.originalTimestamp);
      if (!date) return;

      if (
        date.getDate() === targetDate.getDate() &&
        date.getMonth() === targetDate.getMonth() &&
        date.getFullYear() === targetDate.getFullYear()
      ) {
        const hour = date.getHours();
        hourlyData.set(hour, (hourlyData.get(hour) || 0) + passenger.count);
      }
    });

    // Create 24-hour data
    for (let hour = 0; hour < 24; hour++) {
      dailyData.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        passengers: hourlyData.get(hour) || 0,
        buses: buses.length,
        period: hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
      });
    }

    return dailyData;
  };

  // Generate monthly report
  const generateMonthlyReport = (selectedMonth: string) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthlyData: any[] = [];

    // Get days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Group passengers by day
    const dailyData = new Map<number, number>();

    passengers.forEach((passenger) => {
      const date = parseCustomTimestamp(passenger.originalTimestamp);
      if (!date) return;

      if (date.getFullYear() === year && date.getMonth() + 1 === month) {
        const day = date.getDate();
        dailyData.set(day, (dailyData.get(day) || 0) + passenger.count);
      }
    });

    // Create data for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

      monthlyData.push({
        day: day.toString(),
        dayName,
        date: `${year}-${month.toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`,
        passengers: dailyData.get(day) || 0,
        buses: buses.filter((bus) => {
          return passengers.some((p) => {
            const pDate = parseCustomTimestamp(p.originalTimestamp);
            return (
              pDate &&
              pDate.getDate() === day &&
              pDate.getMonth() + 1 === month &&
              pDate.getFullYear() === year &&
              p.busId === bus.busId
            );
          });
        }).length
      });
    }

    return monthlyData;
  };

  // Generate yearly report
  const generateYearlyReport = (selectedYear: string) => {
    const year = parseInt(selectedYear);
    const yearlyData: any[] = [];

    // Group passengers by month
    const monthlyData = new Map<number, number>();

    passengers.forEach((passenger) => {
      const date = parseCustomTimestamp(passenger.originalTimestamp);
      if (!date) return;

      if (date.getFullYear() === year) {
        const month = date.getMonth() + 1;
        monthlyData.set(month, (monthlyData.get(month) || 0) + passenger.count);
      }
    });

    // Create data for each month
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    for (let month = 1; month <= 12; month++) {
      const season =
        month <= 3
          ? "Winter"
          : month <= 6
          ? "Spring"
          : month <= 9
          ? "Summer"
          : "Fall";

      yearlyData.push({
        month: monthNames[month - 1],
        monthNumber: month,
        passengers: monthlyData.get(month) || 0,
        buses: buses.length,
        season
      });
    }

    return yearlyData;
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    const totalPassengers = reportData.reduce(
      (sum, item) => sum + item.passengers,
      0
    );
    const totalBuses = buses.length;
    const avgPassengers =
      reportData.length > 0
        ? Math.round(totalPassengers / reportData.length)
        : 0;

    // Find peak time
    let peakPassengers = 0;
    let peakTime = "";
    reportData.forEach((item) => {
      if (item.passengers > peakPassengers) {
        peakPassengers = item.passengers;
        peakTime = item.time || item.day || item.month;
      }
    });

    return {
      totalPassengers,
      totalBuses,
      avgPassengers,
      peakTime,
      peakPassengers
    };
  };

  // Fixed PDF generation with better error handling
  const generatePDF = async () => {
    setIsGenerating(true);
    setPdfError(null);
    setIsReportVisible(true);

    try {
      // Wait for the report to become visible
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = reportRef.current;
      if (!element) {
        throw new Error("Report element not found");
      }

      // Create canvas with html2canvas-pro (supports oklch colors)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
        allowTaint: true,
        removeContainer: true
      });

      if (!canvas) {
        throw new Error("Failed to create canvas");
      }

      const imgData = canvas.toDataURL("image/png", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");

      // Calculate dimensions
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add title section with your colors
      pdf.setFillColor(255, 159, 0); // #FF9F00
      pdf.rect(0, 0, 210, 30, "F");

      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("RIDELINK REPORT", 105, 20, { align: "center" });

      // Add metadata section
      pdf.setFillColor(244, 99, 30); // #F4631E
      pdf.rect(10, 35, 190, 20, "F");

      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Owner: ${ownerData?.fullName || "Unknown"}`, 15, 45);
      pdf.text(`Report Type: ${filters.type.toUpperCase()}`, 15, 52);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 120, 45);

      // Handle multi-page content
      let heightLeft = imgHeight;
      let position = 60;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Add additional pages if needed
      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const fileName = `bus-report-${filters.type}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);

      console.log("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setPdfError(
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
      alert(
        `Error generating PDF: ${
          error instanceof Error ? error.message : "Please try again"
        }`
      );
    } finally {
      setIsGenerating(false);
      setIsReportVisible(false);
    }
  };

  // Alternative simple PDF generation (fallback)
  const generateSimplePDF = async () => {
    setIsGenerating(true);
    setPdfError(null);

    try {
      const pdf = new jsPDF();

      // Simple text-based PDF
      pdf.setFontSize(20);
      pdf.setTextColor(255, 159, 0); // #FF9F00
      pdf.text("Bus Transport Report", 20, 30);

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Owner: ${ownerData?.fullName || "Unknown"}`, 20, 50);
      pdf.text(`Report Type: ${filters.type}`, 20, 65);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 80);

      // Add summary
      pdf.text(`Total Passengers: ${stats.totalPassengers}`, 20, 100);
      pdf.text(`Active Buses: ${stats.totalBuses}`, 20, 115);
      pdf.text(`Average per Period: ${stats.avgPassengers}`, 20, 130);

      // Add table headers
      let yPosition = 150;
      pdf.setFontSize(10);

      if (reportData.length > 0) {
        pdf.text("Detailed Data:", 20, yPosition);
        yPosition += 15;

        // Headers
        if (filters.type === "daily") {
          pdf.text("Time", 20, yPosition);
          pdf.text("Passengers", 60, yPosition);
          pdf.text("Buses", 100, yPosition);
        } else if (filters.type === "monthly") {
          pdf.text("Day", 20, yPosition);
          pdf.text("Passengers", 60, yPosition);
          pdf.text("Buses", 100, yPosition);
        } else if (filters.type === "yearly") {
          pdf.text("Month", 20, yPosition);
          pdf.text("Passengers", 60, yPosition);
          pdf.text("Buses", 100, yPosition);
        }

        yPosition += 10;

        // Data rows
        reportData.slice(0, 20).forEach((item) => {
          // Limit to 20 rows to prevent overflow
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20;
          }

          if (filters.type === "daily") {
            pdf.text(item.time, 20, yPosition);
            pdf.text(item.passengers.toString(), 60, yPosition);
            pdf.text(item.buses.toString(), 100, yPosition);
          } else if (filters.type === "monthly") {
            pdf.text(`Day ${item.day}`, 20, yPosition);
            pdf.text(item.passengers.toString(), 60, yPosition);
            pdf.text(item.buses.toString(), 100, yPosition);
          } else if (filters.type === "yearly") {
            pdf.text(item.month, 20, yPosition);
            pdf.text(item.passengers.toString(), 60, yPosition);
            pdf.text(item.buses.toString(), 100, yPosition);
          }

          yPosition += 8;
        });
      }

      const fileName = `bus-report-simple-${filters.type}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating simple PDF:", error);
      alert(
        "Error generating even simple PDF. Please check console for details."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Share report
  const shareReport = async () => {
    if (navigator.share) {
      try {
        await generatePDF();
        await navigator.share({
          title: `Bus Transport ${filters.type} Report`,
          text: `Check out my ${filters.type} bus transport report`,
          url: window.location.href
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      alert(
        "Sharing is not supported on this device. Please download the PDF instead."
      );
    }
  };

  // Update report data when filters change
  useEffect(() => {
    const data = generateReportData();
    setReportData(data);
  }, [filters, passengers, buses]);

  const stats = getSummaryStats();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Error Display */}
        {pdfError && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            <p className="font-semibold">PDF Error: {pdfError}</p>
            <button
              onClick={generateSimplePDF}
              className="mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Try Simple PDF Instead
            </button>
          </div>
        )}

        {/* Header with Your Color Scheme */}
        <div
          className="relative mb-8 overflow-hidden rounded-2xl p-8 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Generate Report
                </h1>
                <p className="text-orange-100">
                  Comprehensive transport insights for{" "}
                  {ownerData?.fullName || "Owner"}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats.totalPassengers}
                </p>
                <p className="text-orange-100 text-sm">Total Passengers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats.totalBuses}
                </p>
                <p className="text-orange-100 text-sm">Active Buses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats.avgPassengers}
                </p>
                <p className="text-orange-100 text-sm">Average</p>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Filter Cards - Updated with your colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Report Type Selector */}
          <div
            className="rounded-xl p-6 border-2 transition-all duration-300 group"
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              backdropFilter: "blur(30px)",
              borderColor: "rgba(255, 159, 0, 0.2)"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#FF9F00")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255, 159, 0, 0.2)")
            }
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)"
                }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Report Type</h3>
            </div>
            <div className="space-y-3">
              {["daily", "monthly", "yearly"].map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type}
                    checked={filters.type === type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.value as any })
                    }
                    className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 focus:ring-orange-500"
                  />
                  <span className="text-gray-300 group-hover:text-white capitalize transition-colors">
                    {type === "daily" && "Daily Insights"}
                    {type === "monthly" && "Monthly Overview"}
                    {type === "yearly" && "Annual Summary"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date/Month/Year Selector */}
          <div
            className="rounded-xl p-6 border-2 transition-all duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              backdropFilter: "blur(30px)",
              borderColor: "rgba(255, 159, 0, 0.2)"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#FF9F00")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255, 159, 0, 0.2)")
            }
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)"
                }}
              >
                {filters.type === "daily" && (
                  <Calendar className="w-6 h-6 text-white" />
                )}
                {filters.type === "monthly" && (
                  <CalendarDays className="w-6 h-6 text-white" />
                )}
                {filters.type === "yearly" && (
                  <CalendarRange className="w-6 h-6 text-white" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-white">
                {filters.type === "daily" && "Select Date"}
                {filters.type === "monthly" && "Select Month"}
                {filters.type === "yearly" && "Select Year"}
              </h3>
            </div>

            {filters.type === "daily" && (
              <input
                type="date"
                value={filters.date || new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            )}

            {filters.type === "monthly" && (
              <input
                type="month"
                value={
                  filters.month ||
                  `${new Date().getFullYear()}-${String(
                    new Date().getMonth() + 1
                  ).padStart(2, "0")}`
                }
                onChange={(e) =>
                  setFilters({ ...filters, month: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            )}

            {filters.type === "yearly" && (
              <select
                value={filters.year || new Date().getFullYear().toString()}
                onChange={(e) =>
                  setFilters({ ...filters, year: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              >
                {[...Array(5)].map((_, i) => (
                  <option
                    key={new Date().getFullYear() - i}
                    value={new Date().getFullYear() - i}
                    className="bg-gray-800"
                  >
                    {new Date().getFullYear() - i}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Stats */}
          <div
            className="rounded-xl p-6 border-2 transition-all duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              backdropFilter: "blur(30px)",
              borderColor: "rgba(255, 159, 0, 0.2)"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#FF9F00")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255, 159, 0, 0.2)")
            }
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)"
                }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Peak Period:</span>
                <span className="text-white font-semibold">
                  {stats.peakTime || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Peak Passengers:</span>
                <span className="font-semibold" style={{ color: "#FF9F00" }}>
                  {stats.peakPassengers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Utilization:</span>
                <span className="font-semibold" style={{ color: "#F4631E" }}>
                  {stats.totalBuses > 0
                    ? Math.round(
                        (stats.totalPassengers / (stats.totalBuses * 50)) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Action Buttons - Updated with your gradient */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="group relative flex items-center justify-center space-x-3 px-8 py-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)",
              boxShadow: "0 10px 30px rgba(244, 99, 30, 0.4)"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 12px 35px rgba(244, 99, 30, 0.6)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(244, 99, 30, 0.4)")
            }
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {isGenerating ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-semibold">
                  Creating Magic...
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 relative z-10">
                <Download className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">
                  Download Report
                </span>
              </div>
            )}
          </button>

          <button
            onClick={shareReport}
            disabled={isGenerating}
            className="group flex items-center justify-center space-x-3 px-8 py-4 bg-gray-800 border-2 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
            style={{ borderColor: "rgba(255, 159, 0, 0.3)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#FF9F00")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255, 159, 0, 0.3)")
            }
          >
            <Share2 className="w-5 h-5" style={{ color: "#FFFFFF" }} />
            <span className="font-semibold" style={{ color: "#FFFFFF" }}>
              Share Report
            </span>
          </button>

          <button
            onClick={() => setIsReportVisible(!isReportVisible)}
            className="group flex items-center justify-center space-x-3 px-8 py-4 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-gray-500 transition-all duration-300"
          >
            <FileSpreadsheet className="w-5 h-5 text-white group-hover:text-gray-300 transition-colors" />
            <span className="text-white group-hover:text-white font-semibold transition-colors">
              {isReportVisible ? "Hide Preview" : "Preview Report"}
            </span>
          </button>
        </div>

        {/* Creative Report Preview - Updated with your colors */}
        {isReportVisible && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div
              className="p-8 text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #FF9F00 0%, #F4631E 50%, #CB041F 100%)"
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Bus className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">
                      Transport Analytics Report
                    </h2>
                    <p className="text-orange-100">
                      {filters.type === "daily" &&
                        `Daily Report - ${
                          filters.date || new Date().toLocaleDateString()
                        }`}
                      {filters.type === "monthly" &&
                        `Monthly Report - ${
                          filters.month ||
                          new Date().toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric"
                          })
                        }`}
                      {filters.type === "yearly" &&
                        `Annual Report - ${
                          filters.year || new Date().getFullYear()
                        }`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div ref={reportRef} className="p-8">
              {/* Summary Cards in Report */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">
                      Total Passengers
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">
                    {stats.totalPassengers}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <Bus className="w-6 h-6 text-green-600" />
                    <h3 className="text-sm font-semibold text-green-900">
                      Active Buses
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-green-900">
                    {stats.totalBuses}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                    <h3 className="text-sm font-semibold text-purple-900">
                      Average
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    {stats.avgPassengers}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock className="w-6 h-6 text-orange-600" />
                    <h3 className="text-sm font-semibold text-orange-900">
                      Peak Time
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-orange-900">
                    {stats.peakTime || "N/A"}
                  </p>
                </div>
              </div>

              {/* Creative Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div
                  className="px-6 py-4 border-b border-gray-200"
                  style={{
                    background:
                      "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)"
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <BarChart3
                      className="w-5 h-5"
                      style={{ color: "#F4631E" }}
                    />
                    <span>Detailed Breakdown</span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {filters.type === "daily" && (
                          <>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Time Period
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Passengers
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Active Buses
                            </th>
                          </>
                        )}
                        {filters.type === "monthly" && (
                          <>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Day
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Passengers
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Active Buses
                            </th>
                          </>
                        )}
                        {filters.type === "yearly" && (
                          <>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Month
                            </th>

                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Passengers
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Active Buses
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {filters.type === "daily" && (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {item.time}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {item.passengers}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {item.buses}
                              </td>
                            </>
                          )}
                          {filters.type === "monthly" && (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                Day {item.day} ({item.dayName})
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {item.date}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {item.passengers}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {item.buses}
                              </td>
                            </>
                          )}
                          {filters.type === "yearly" && (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {item.month}
                              </td>

                              <td className="px-6 py-4 text-sm text-gray-700">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {item.passengers}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {item.buses}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Footer */}
              <div
                className="mt-8 p-6 rounded-xl border border-gray-200"
                style={{
                  background:
                    "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)"
                }}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "#CB041F" }}
                  />
                  <span>Report Summary</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalPassengers}
                    </p>
                    <p className="text-sm text-gray-600">Total Passengers</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalBuses}
                    </p>
                    <p className="text-sm text-gray-600">Active Buses</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.avgPassengers}
                    </p>
                    <p className="text-sm text-gray-600">Average per Period</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsSection;
