// src/pages/Report.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../css/Report.module.css';
import HomeNavBar from '../components/HomeNavBar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Import toast from React Toastify

const Report = () => {
    const [reportType, setReportType] = useState('revenue');
    const [reportPeriodType, setReportPeriodType] = useState('date_range'); // 'date_range', 'month', 'year', or 'single_day'
    const [startDate, setStartDate] = useState(null); // Date object
    const [endDate, setEndDate] = useState(null); // Date object
    const [selectedMonth, setSelectedMonth] = useState(null); // Date object
    const [selectedYear, setSelectedYear] = useState(null); // Date object
    const [selectedDate, setSelectedDate] = useState(null); // Date object
    const [itemCategory, setItemCategory] = useState([]); // Now an array
    const [paymentMethod, setPaymentMethod] = useState([]); // Now an array
    const [itemId, setItemId] = useState([]); // Now an array
    const [availableItems, setAvailableItems] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    // Redirect non-admin and non-staff users
    useEffect(() => {
        if (role !== 'admin' && role !== 'staff') {
            navigate('/'); // Redirect to home or appropriate page
        }
    }, [role, navigate]);

    // Fetch available options for the filters when reportType changes
    useEffect(() => {
        if (reportType === 'revenue' || reportType === 'transaction_details') {
            // Fetch available items
            axios
                .get(`${process.env.REACT_APP_API_URL}/giftshopitemsreport`, {
                    headers: { 'Content-Type': 'application/json' },
                })
                .then((response) => setAvailableItems(response.data))
                .catch((error) => {
                    console.error('Error fetching items:', error);
                    toast.error('Error fetching items.');
                });

            // Fetch available categories
            axios
                .get(`${process.env.REACT_APP_API_URL}/giftshopcategories`, {
                    headers: { 'Content-Type': 'application/json' },
                })
                .then((response) => setAvailableCategories(response.data))
                .catch((error) => {
                    console.error('Error fetching categories:', error);
                    toast.error('Error fetching categories.');
                });

            // Fetch available payment methods
            axios
                .get(`${process.env.REACT_APP_API_URL}/paymentmethods`, {
                    headers: { 'Content-Type': 'application/json' },
                })
                .then((response) => setAvailablePaymentMethods(response.data))
                .catch((error) => {
                    console.error('Error fetching payment methods:', error);
                    toast.error('Error fetching payment methods.');
                });
        }
    }, [reportType]);

    // Clear report data when report period type changes
    useEffect(() => {
        setReportData([]);
    }, [reportPeriodType]);

    // Fetch report data when the "Generate Report" button is clicked
    const fetchReportData = () => {
        // Input validation
        if (!reportType) {
            toast.error('Please select a report type.');
            return;
        }
        if (reportPeriodType === 'date_range') {
            if (!startDate || !endDate) {
                toast.error('Please select start and end dates.');
                return;
            }
            if (startDate > endDate) {
                toast.error('Start date cannot be after end date.');
                return;
            }
        } else if (reportPeriodType === 'month') {
            if (!selectedMonth) {
                toast.error('Please select a month.');
                return;
            }
        } else if (reportPeriodType === 'year') {
            if (!selectedYear) {
                toast.error('Please select a year.');
                return;
            }
        } else if (reportPeriodType === 'single_day') {
            if (!selectedDate) {
                toast.error('Please select a date.');
                return;
            }
        }

        setLoading(true);

        // Prepare data for backend
        const reportRequest = {
            report_type: reportType,
            report_period_type: reportPeriodType,
            start_date: startDate ? startDate.toISOString().split('T')[0] : '',
            end_date: endDate ? endDate.toISOString().split('T')[0] : '',
            selected_month: selectedMonth ? selectedMonth.toISOString().split('T')[0].slice(0, 7) : '',
            selected_year: selectedYear ? selectedYear.getFullYear().toString() : '',
            selected_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
            item_category: itemCategory.map((option) => option.value),
            payment_method: paymentMethod.map((option) => option.value),
            item_id: itemId.map((option) => option.value),
        };

        axios
            .post(`${process.env.REACT_APP_API_URL}/reports`, reportRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId,
                    role: role,
                },
            })
            .then((response) => {
                setReportData(response.data.reportData);
                setLoading(false);
                toast.success('Report generated successfully!');
            })
            .catch((error) => {
                console.error('Error fetching report data:', error);
                const errorMsg =
                    error.response?.data?.message || 'Error fetching report data.';
                toast.error(errorMsg);
                setLoading(false);
            });
    };

    const handleGenerateReport = () => {
        fetchReportData();
    };

    // Function to render report data based on report type
    const renderReportTable = () => {
        if (loading) {
            return <p>Loading report...</p>;
        }

        if (reportData.length === 0) {
            return <p>No data available for the selected report.</p>;
        }

        // Check for 'revenue' report with 'single_day' period type
        if (reportType === 'revenue' && reportPeriodType === 'single_day') {
            return renderSingleDayRevenueReport();
        }

        switch (reportType) {
            case 'revenue':
                return renderRevenueReport();
            case 'transaction_details':
                return renderTransactionDetailsReport();
            default:
                return null;
        }
    };

    const renderRevenueReport = () => {
        // Calculate total revenue
        const totalRevenue = reportData.reduce(
            (acc, curr) => acc + parseFloat(curr.total_revenue || 0),
            0
        );

        return (
            <>
                <table className={styles.reportTable}>
                    <thead>
                    <tr>
                        <th>{getDateLabel()}</th>
                        <th>Total Revenue</th>
                    </tr>
                    </thead>
                    <tbody>
                    {reportData.map((item, index) => {
                        // Convert total_revenue to a number
                        const revenue = Number(item.total_revenue);

                        // Handle cases where revenue is not a valid number
                        const formattedRevenue = isNaN(revenue) ? 'N/A' : revenue.toFixed(2);

                        return (
                            <tr key={index}>
                                <td>{formatDateLabel(item.date)}</td>
                                <td>${formattedRevenue}</td>
                            </tr>
                        );
                    })}
                    {/* Total Revenue Row */}
                    <tr>
                        <td>
                            <strong>Total Revenue</strong>
                        </td>
                        <td>
                            <strong>${totalRevenue.toFixed(2)}</strong>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </>
        );
    };

    // Function to render revenue report for 'single_day' period type
    const renderSingleDayRevenueReport = () => {
        // Group transactions by transaction ID to group items within the same transaction
        const transactions = {};

        reportData.forEach((item) => {
            if (!transactions[item.transaction_id]) {
                transactions[item.transaction_id] = {
                    transaction_id: item.transaction_id,
                    transaction_date: item.transaction_date,
                    transaction_type: item.transaction_type,
                    payment_status: item.payment_status,
                    username: item.username,
                    items: [],
                    total_amount: 0,
                };
            }
            transactions[item.transaction_id].items.push({
                item_id: item.item_id,
                item_name: item.item_name,
                category: item.category, // Include category
                quantity: item.quantity,
                price_at_purchase: item.price_at_purchase,
                item_total: item.item_total,
            });
            transactions[item.transaction_id].total_amount += parseFloat(item.item_total || 0);
        });

        // Convert transactions object to array
        const transactionsArray = Object.values(transactions);

        return (
            <>
                <table className={styles.reportTable}>
                    <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Transaction Time</th>
                        <th>User</th>
                        <th>Payment Method</th>
                        <th>Payment Status</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                    </tr>
                    </thead>
                    <tbody>
                    {transactionsArray.map((transaction, index) => (
                        <tr key={index}>
                            <td>{transaction.transaction_id}</td>
                            <td>{new Date(transaction.transaction_date).toLocaleString()}</td>
                            <td>{transaction.username}</td>
                            <td>{transaction.transaction_type}</td>
                            <td>{transaction.payment_status}</td>
                            <td>
                                {transaction.items.map((item, idx) => (
                                    <div key={idx}>
                                        <strong>{item.item_name}</strong> (ID: {item.item_id})<br />
                                        Category: {item.category}<br /> {/* Display category */}
                                        Quantity: {item.quantity}<br />
                                        Price: ${parseFloat(item.price_at_purchase).toFixed(2)}<br />
                                        Item Total: ${parseFloat(item.item_total).toFixed(2)}<br />
                                    </div>
                                ))}
                            </td>
                            <td>${transaction.total_amount.toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </>
        );
    };

    const renderTransactionDetailsReport = () => {
        return (
            <table className={styles.reportTable}>
                <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Transaction Date</th>
                    <th>User</th>
                    <th>Payment Method</th>
                    <th>Payment Status</th>
                    <th>Item ID</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Price at Purchase</th>
                    <th>Item Total</th>
                </tr>
                </thead>
                <tbody>
                {reportData.map((item, index) => (
                    <tr key={index}>
                        <td>{item.transaction_id}</td>
                        <td>{new Date(item.transaction_date).toLocaleString()}</td>
                        <td>{item.username}</td>
                        <td>{item.transaction_type}</td>
                        <td>{item.payment_status}</td>
                        <td>{item.item_id}</td>
                        <td>{item.item_name}</td>
                        <td>{item.quantity}</td>
                        <td>${parseFloat(item.price_at_purchase).toFixed(2)}</td>
                        <td>${parseFloat(item.item_total).toFixed(2)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        );
    };

    // Helper functions to get and format date labels
    const getDateLabel = () => {
        if (
            reportPeriodType === 'month' ||
            reportPeriodType === 'date_range' ||
            reportPeriodType === 'single_day'
        ) {
            return 'Date';
        } else if (reportPeriodType === 'year') {
            return 'Month';
        }
        return 'Date';
    };

    const formatDateLabel = (dateStr) => {
        if (!dateStr) {
            return 'N/A';
        }
        if (
            reportPeriodType === 'month' ||
            reportPeriodType === 'date_range' ||
            reportPeriodType === 'single_day'
        ) {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj)) {
                return 'Invalid Date';
            }
            return dateObj.toLocaleDateString();
        } else if (reportPeriodType === 'year') {
            // dateStr is 'YYYY-MM'
            const [year, month] = dateStr.split('-');
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
        }
        return dateStr;
    };

    // Function to generate PDF of the report
    const generatePDF = () => {
        try {
            const doc = new jsPDF();

            if (reportType === 'revenue' && reportPeriodType === 'single_day') {
                doc.text('Revenue Report - Single Day', 14, 20);

                // Group transactions by transaction ID
                const transactions = {};
                reportData.forEach((item) => {
                    if (!transactions[item.transaction_id]) {
                        transactions[item.transaction_id] = {
                            transaction_id: item.transaction_id,
                            transaction_date: new Date(item.transaction_date).toLocaleString(),
                            username: item.username,
                            transaction_type: item.transaction_type,
                            payment_status: item.payment_status,
                            items: [],
                            total_amount: 0,
                        };
                    }

                    // Add item and update total
                    if (item.quantity) {
                        transactions[item.transaction_id].items.push({
                            item_name: item.item_name || 'Item',
                            item_id: item.item_id,
                            category: item.category, // Include category
                            quantity: item.quantity,
                            price_at_purchase: item.price_at_purchase || 0,
                            item_total: parseFloat(item.item_total || 0)
                        });
                        transactions[item.transaction_id].total_amount += parseFloat(item.item_total || 0);
                    }
                });

                // Create table body
                const body = Object.values(transactions).map(trans => [
                    trans.transaction_id,
                    trans.transaction_date,
                    trans.username,
                    trans.transaction_type,
                    trans.payment_status,
                    // Format items details
                    trans.items.map(item =>
                        `${item.item_name}\nID: ${item.item_id}\nCategory: ${item.category}\nQty: ${item.quantity}\nPrice: $${parseFloat(item.price_at_purchase).toFixed(2)}\nTotal: $${item.item_total.toFixed(2)}`
                    ).join('\n\n'),
                    // Format total amount
                    `$${trans.total_amount.toFixed(2)}`,
                ]);

                // Calculate grand total
                const grandTotal = Object.values(transactions).reduce(
                    (sum, trans) => sum + trans.total_amount,
                    0
                );

                // Add footer row with total
                body.push(['', '', '', '', '', 'Total:', `$${grandTotal.toFixed(2)}`]);

                doc.autoTable({
                    head: [['Trans ID', 'Date', 'User', 'Payment', 'Status', 'Items', 'Total']],
                    body: body,
                    startY: 30,
                    styles: { fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 15 }, // Trans ID
                        1: { cellWidth: 35 }, // Date
                        2: { cellWidth: 15 }, // User
                        3: { cellWidth: 17 }, // Payment
                        4: { cellWidth: 20 }, // Status
                        5: { cellWidth: 70 }, // Items (increased width)
                        6: { cellWidth: 25 }, // Total
                    },
                    headStyles: { fillColor: [66, 139, 202] },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (reportType === 'revenue') {
                doc.text('Revenue Report', 14, 20);
                let body = reportData.map((item) => {
                    const revenue = Number(item.total_revenue);
                    const formattedRevenue = isNaN(revenue) ? 'N/A' : revenue.toFixed(2);
                    const dateLabel = formatDateLabel(item.date);
                    return [dateLabel, formattedRevenue];
                });

                // Add total revenue row
                const totalRevenue = reportData.reduce(
                    (acc, curr) => acc + parseFloat(curr.total_revenue || 0),
                    0
                );
                body.push(['Total Revenue', totalRevenue.toFixed(2)]);

                doc.autoTable({
                    head: [[getDateLabel(), 'Total Revenue']],
                    body: body,
                    startY: 30,
                });
            } else if (reportType === 'transaction_details') {
                doc.text('Transaction Details Report', 14, 20);

                let body = reportData.map((item) => {
                    return [
                        item.transaction_id,
                        new Date(item.transaction_date).toLocaleString(),
                        item.username,
                        item.transaction_type,
                        item.payment_status,
                        item.item_id,
                        item.item_name,
                        item.quantity,
                        parseFloat(item.price_at_purchase).toFixed(2),
                        parseFloat(item.item_total).toFixed(2),
                    ];
                });

                doc.autoTable({
                    head: [
                        [
                            'Transaction ID',
                            'Transaction Date',
                            'User',
                            'Payment Method',
                            'Payment Status',
                            'Item ID',
                            'Item Name',
                            'Quantity',
                            'Price at Purchase',
                            'Item Total',
                        ],
                    ],
                    body: body,
                    startY: 30,
                    styles: { fontSize: 8 },
                });
            }

            doc.save(`${reportType}_report.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Error generating PDF.');
        }
    };

    return (
        <div className={styles.reportContainer}>
            <HomeNavBar />
            <h1 className={styles.title}>Gift Shop Report</h1>
            <div className={styles.filterContainer}>
                <div className={styles.formGroup}>
                    <label htmlFor="reportType">Report Type:</label>
                    <select
                        id="reportType"
                        value={reportType}
                        onChange={(e) => {
                            setReportType(e.target.value);
                            setItemCategory([]);
                            setPaymentMethod([]);
                            setItemId([]);
                            setReportData([]);
                        }}
                    >
                        <option value="revenue">Revenue Report</option>
                        <option value="transaction_details">Transaction Details Report</option>
                    </select>
                </div>
                {/* Report Period Type Selection using Buttons */}
                <div className={styles.formGroup}>
                    <label>Report Period:</label>
                    <div className={styles.buttonGroup}>
                        <button
                            className={`${styles.toggleButton} ${
                                reportPeriodType === 'date_range' ? styles.activeButton : ''
                            }`}
                            onClick={() => {
                                setReportPeriodType('date_range');
                                setReportData([]);
                            }}
                        >
                            By Date Range
                        </button>
                        <button
                            className={`${styles.toggleButton} ${
                                reportPeriodType === 'month' ? styles.activeButton : ''
                            }`}
                            onClick={() => {
                                setReportPeriodType('month');
                                setReportData([]);
                            }}
                        >
                            By Month
                        </button>
                        <button
                            className={`${styles.toggleButton} ${
                                reportPeriodType === 'year' ? styles.activeButton : ''
                            }`}
                            onClick={() => {
                                setReportPeriodType('year');
                                setReportData([]);
                            }}
                        >
                            By Year
                        </button>
                        <button
                            className={`${styles.toggleButton} ${
                                reportPeriodType === 'single_day' ? styles.activeButton : ''
                            }`}
                            onClick={() => {
                                setReportPeriodType('single_day');
                                setReportData([]);
                            }}
                        >
                            Single Day
                        </button>
                    </div>
                </div>

                {(reportType === 'revenue' || reportType === 'transaction_details') && (
                    <>
                        <div className={styles.formGroup}>
                            <label htmlFor="itemCategory">Category:</label>
                            <Select
                                isMulti
                                id="itemCategory"
                                value={itemCategory}
                                onChange={(selectedOptions) => {
                                    setItemCategory(selectedOptions || []);
                                    setReportData([]);
                                }}
                                options={availableCategories.map((category) => ({
                                    value: category.category,
                                    label: category.category,
                                }))}
                                className={styles.multiSelect}
                                placeholder="Select Categories..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="itemId">Item:</label>
                            <Select
                                isMulti
                                id="itemId"
                                value={itemId}
                                onChange={(selectedOptions) => {
                                    setItemId(selectedOptions || []);
                                    setReportData([]);
                                }}
                                options={availableItems.map((item) => ({
                                    value: item.item_id,
                                    label: item.name_,
                                }))}
                                className={styles.multiSelect}
                                placeholder="Select Items..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="paymentMethod">Payment Method:</label>
                            <Select
                                isMulti
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(selectedOptions) => {
                                    setPaymentMethod(selectedOptions || []);
                                    setReportData([]);
                                }}
                                options={availablePaymentMethods.map((method) => ({
                                    value: method.transaction_type,
                                    label: method.transaction_type,
                                }))}
                                className={styles.multiSelect}
                                placeholder="Select Payment Methods..."
                            />
                        </div>
                    </>
                )}

                {/* Date Range Inputs */}
                {reportPeriodType === 'date_range' && (
                    <>
                        <div className={styles.formGroup}>
                            <label htmlFor="startDate">Start Date:</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                dateFormat="yyyy-MM-dd"
                                className={styles.datePicker}
                                placeholderText="Select Start Date"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="endDate">End Date:</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                dateFormat="yyyy-MM-dd"
                                className={styles.datePicker}
                                placeholderText="Select End Date"
                            />
                        </div>
                    </>
                )}

                {/* Month Picker Input */}
                {reportPeriodType === 'month' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="selectedMonth">Select Month:</label>
                        <DatePicker
                            selected={selectedMonth}
                            onChange={(date) => setSelectedMonth(date)}
                            dateFormat="yyyy-MM"
                            showMonthYearPicker
                            className={styles.datePicker}
                            placeholderText="Select Month"
                        />
                    </div>
                )}

                {/* Year Picker Input */}
                {reportPeriodType === 'year' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="selectedYear">Select Year:</label>
                        <DatePicker
                            selected={selectedYear}
                            onChange={(date) => setSelectedYear(date)}
                            dateFormat="yyyy"
                            showYearPicker
                            className={styles.datePicker}
                            placeholderText="Select Year"
                        />
                    </div>
                )}

                {/* Single Day Picker Input */}
                {reportPeriodType === 'single_day' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="selectedDate">Select Date:</label>
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            dateFormat="yyyy-MM-dd"
                            className={styles.datePicker}
                            placeholderText="Select Date"
                        />
                    </div>
                )}

                <button
                    className={styles.generateButton}
                    onClick={handleGenerateReport}
                    disabled={loading}
                >
                    {loading ? 'Generating Report...' : 'Generate Report'}
                </button>
                {reportData.length > 0 && (
                    <button className={styles.generateButton} onClick={generatePDF}>
                        Download PDF
                    </button>
                )}
            </div>
            <div className={styles.tableContainer}>{renderReportTable()}</div>
        </div>
    );
};

export default Report;
