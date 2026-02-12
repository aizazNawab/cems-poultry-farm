import React, { useState, useEffect } from 'react';
import { Plus, LogIn, LogOut, Users, FileText, Printer, Trash2, Search, Download, Edit } from 'lucide-react';
import * as api from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('entry');
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Edit states
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const verifyPin = async () => {
    if (!pin) {
      setPinError('Please enter PIN');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      await api.verifyPin(pin);
      setIsUnlocked(true);
    } catch (err) {
      setPinError('❌ Wrong PIN');
    }

    setPinLoading(false);
  };

  // Search states
  const [pendingSearch, setPendingSearch] = useState('');
  const [completedSearch, setCompletedSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showBalanceOnly, setShowBalanceOnly] = useState(false);

  // Selected customer for details modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Entry form
  const [customerType, setCustomerType] = useState(null);
  const [existingCustomerData, setExistingCustomerData] = useState(null);
  const [entryForm, setEntryForm] = useState({
    truckNumber: '',
    contactNumber: '',
    customerName: '',
    emptyWeight: '',
    advancePayment: '',
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  });

  // Exit form
  const [exitForm, setExitForm] = useState({
    truckNumber: '',
    contactNumber: '',
    customerName: '',
    emptyWeight: '',
    loadedWeight: '',
    netWeight: '',
    ratePerKg: '',
    totalAmount: '',
    advancePaid: '',
    oldBalance: '',
    paidNow: '',
    returnPayment: '',
    finalBalance: '',
    exitDate: new Date().toISOString().split('T')[0],
    exitTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    shedLocation: '',
    paymentMethod: 'cash'
  });

  const [selectedEntry, setSelectedEntry] = useState(null);

  // Load data
  useEffect(() => {
    loadCustomers();
    loadPendingEntries();
    loadTransactions();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('⚠️ Failed to load customers. Please check your connection.');
    }
  };

  const loadPendingEntries = async () => {
    try {
      const response = await api.getPendingEntries();
      setEntries(response.data);
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('⚠️ Failed to load pending entries. Please check your connection.');
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions({});
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('⚠️ Failed to load transactions. Please check your connection.');
    }
  };

  // Filter functions
  const filteredPendingEntries = entries.filter(entry => 
    entry.truckNumber.toLowerCase().includes(pendingSearch.toLowerCase()) ||
    entry.customerName.toLowerCase().includes(pendingSearch.toLowerCase()) ||
    entry.contactNumber.includes(pendingSearch)
  );

  const filteredTransactions = transactions
    .filter(trans => {
      const matchesSearch = trans.truckNumber.toLowerCase().includes(completedSearch.toLowerCase()) ||
        trans.customerName.toLowerCase().includes(completedSearch.toLowerCase()) ||
        trans.contactNumber.includes(completedSearch) ||
        trans.entryNumber.includes(completedSearch);
      
      // Fix date comparison - convert both to YYYY-MM-DD format
      const matchesDate = selectedDate 
        ? new Date(trans.exitDate).toISOString().split('T')[0] === selectedDate 
        : true;
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filteredCustomers = customers.filter(cust => 
    (cust.truckNumber.toLowerCase().includes(customerSearch.toLowerCase()) ||
    cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    cust.contactNumber.includes(customerSearch)) &&
    (!showBalanceOnly || (cust.balance !== 0 && cust.balance != null))
  );

  // Entry handlers
  const searchExistingCustomer = async () => {
    if (!entryForm.truckNumber) {
      alert('Please enter Truck Number!');
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await api.findCustomer(entryForm.truckNumber);
      if (response.data) {
        const customer = response.data;
        setExistingCustomerData(customer);
        setEntryForm(prev => ({
          ...prev,
          customerName: customer.name,
          truckNumber: customer.truckNumber,
          contactNumber: customer.contactNumber
        }));
      } else {
        alert('❌ Customer not found with this truck number!');
        setExistingCustomerData(null);
      }
    } catch (error) {
      console.error('Error finding customer:', error);
      alert('❌ Error searching for customer. Please try again.');
      setExistingCustomerData(null);
    }
    setSearchLoading(false);
  };

  const saveEntry = async () => {
    if (!entryForm.truckNumber || !entryForm.contactNumber || !entryForm.customerName) {
      alert('Please fill required fields!');
      return;
    }
    setLoading(true);
    try {
      const response = await api.createEntry({
        ...entryForm,
        customerType: customerType
      });
      
      if (window.confirm('Entry saved successfully!\n\nDo you want to print the receipt?')) {
        printEntryReceipt(response.data);
      }
      
      resetEntryForm();
      loadPendingEntries();
      loadCustomers();
    } catch (error) {
      console.error('Error saving entry:', error);
      const errorMessage = error.response?.data?.message || 'Error saving entry!';
      alert(`❌ ${errorMessage}`);
    }
    setLoading(false);
  };

  const resetEntryForm = () => {
    setEntryForm({
      truckNumber: '',
      contactNumber: '',
      customerName: '',
      emptyWeight: '',
      advancePayment: '',
      entryDate: new Date().toISOString().split('T')[0],
      entryTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });
    setCustomerType(null);
    setExistingCustomerData(null);
  };

  // Exit handlers
  const searchExitEntry = async () => {
    if (!exitForm.truckNumber) {
      alert('Please enter Truck Number!');
      return;
    }

    setSearchLoading(true);
    try {
      const entryResponse = await api.findEntry(exitForm.truckNumber);
      
      if (entryResponse.data) {
        const entry = entryResponse.data;
        setSelectedEntry(entry);
        
        const customerResponse = await api.findCustomer(entry.truckNumber);
        const customer = customerResponse.data;

        setExitForm(prev => ({
          ...prev,
          truckNumber: entry.truckNumber,
          contactNumber: entry.contactNumber,
          customerName: entry.customerName,
          emptyWeight: entry.emptyWeight,
          advancePaid: entry.advancePayment || '0',
          oldBalance: customer?.balance || '0'
        }));
      } else {
        alert('❌ No pending entry found for this truck number!');
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error('Error finding entry:', error);
      alert('❌ Error searching for entry. Please try again.');
      setSelectedEntry(null);
    }
    setSearchLoading(false);
  };

  useEffect(() => {
    if (exitForm.loadedWeight && exitForm.emptyWeight) {
      const net = parseFloat(exitForm.loadedWeight) - parseFloat(exitForm.emptyWeight);
      setExitForm(prev => ({ ...prev, netWeight: net.toFixed(0) }));
    }
  }, [exitForm.loadedWeight, exitForm.emptyWeight]);

 
  useEffect(() => {
    if (exitForm.netWeight && exitForm.ratePerKg) {
      const total = parseFloat(exitForm.netWeight) * parseFloat(exitForm.ratePerKg);
      setExitForm(prev => ({ ...prev, totalAmount: total.toFixed(0) }));
    }
  }, [exitForm.netWeight, exitForm.ratePerKg]);

  useEffect(() => {
    const total = parseFloat(exitForm.totalAmount) || 0;
    const advance = parseFloat(exitForm.advancePaid) || 0;
    const oldBal = parseFloat(exitForm.oldBalance) || 0;
    const paidNow = parseFloat(exitForm.paidNow) || 0;
    const returnPay = parseFloat(exitForm.returnPayment) || 0;
    // Final Balance = (Total + Old Balance) - (Advance + Paid Now - Return Payment)
    // Return payment REDUCES what customer owes (we're giving money back)
    // So it should be ADDED to the total payments side
    const finalBal = (total + oldBal) - (advance + paidNow - returnPay);
    setExitForm(prev => ({ ...prev, finalBalance: finalBal.toFixed(0) }));
  }, [exitForm.totalAmount, exitForm.advancePaid, exitForm.oldBalance, exitForm.paidNow, exitForm.returnPayment]);

  const saveExit = async () => {
    if (!exitForm.loadedWeight || !exitForm.ratePerKg || !selectedEntry) {
      alert('Please fill required fields!');
      return;
    }
    setLoading(true);
    try {
      const transactionData = {
        entryId: selectedEntry._id,
        loadedWeight: exitForm.loadedWeight,
        netWeight: exitForm.netWeight,
        ratePerKg: exitForm.ratePerKg,
        totalAmount: exitForm.totalAmount,
        advancePaid: exitForm.advancePaid,
        oldBalance: exitForm.oldBalance,
        paidNow: exitForm.paidNow,
        returnPayment: exitForm.returnPayment,
        finalBalance: exitForm.finalBalance,
        shedLocation: exitForm.shedLocation,
        exitDate: exitForm.exitDate,
        exitTime: exitForm.exitTime,
        paymentMethod: exitForm.paymentMethod
      };
      
      console.log('Sending transaction data:', transactionData);
      const response = await api.createTransaction(transactionData);
      
      if (window.confirm('Exit completed successfully!\n\nDo you want to print the invoice?')) {
        printInvoice(response.data);
      }
      
      resetExitForm();
      setSelectedEntry(null);
      loadPendingEntries();
      loadTransactions();
      loadCustomers();
    } catch (error) {
      console.error('Error completing exit:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error completing exit! Please try again.';
      alert(`❌ ${errorMessage}`);
    }
    setLoading(false);
  };

  const resetExitForm = () => {
    setExitForm({
      truckNumber: '',
      contactNumber: '',
      customerName: '',
      emptyWeight: '',
      loadedWeight: '',
      netWeight: '',
      ratePerKg: '',
      totalAmount: '',
      advancePaid: '',
      oldBalance: '',
      paidNow: '',
      returnPayment: '',
      finalBalance: '',
      exitDate: new Date().toISOString().split('T')[0],
      exitTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      shedLocation: '',
      paymentMethod: 'cash'
    });
    setSelectedEntry(null);
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export!');
      return;
    }

    const headers = ['Entry #', 'Date', 'Customer Name', 'Truck Number', 'Contact', 'Net Weight (kg)', 'Rate (PKR/kg)', 'Total Amount', 'Old Balance', 'Paid Now', 'Return Payment', 'Final Balance', 'Payment Method', 'Location'];
    
    const csvData = filteredTransactions.map(trans => [
      trans.entryNumber,
      new Date(trans.exitDate).toLocaleDateString('en-GB'),
      trans.customerName,
      trans.truckNumber,
      trans.contactNumber,
      trans.netWeight,
      trans.ratePerKg || trans.ratePerMaund || '',
      trans.totalAmount,
      trans.oldBalance,
      trans.paidNow || 0,
      trans.returnPayment || 0,
      trans.finalBalance,
      trans.paymentMethod || 'cash',
      trans.shedLocation || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${selectedDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printInvoice = (transaction) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('❌ Could not open print window. Please allow popups for this site in your browser settings.');
      return;
    }
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>Invoice ${transaction.entryNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; }
            .invoice-type { background: #000; color: white; padding: 8px; margin: 15px 0; text-align: center; }
            .row { display: flex; justify-content: space-between; padding: 8px 5px; border-bottom: 1px solid #ddd; }
            .label { font-weight: bold; }
            .total { background: #333; color: white; padding: 12px; margin-top: 15px; font-size: 20px; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Qaiser</div>
            <div>Poultry Farm / پولٹری فارم</div>
          </div>
          <div class="invoice-type">SALE INVOICE - Driver Copy</div>
          <div class="row"><span>رسید نمبر</span><span class="label">${transaction.entryNumber}</span></div>
          <div class="row"><span>تاریخ / Date</span><span class="label">${transaction.exitDate} ${transaction.exitTime}</span></div>
          <div class="row"><span>ڈرائیور کا نام</span><span class="label">${transaction.customerName}</span></div>
          <div class="row"><span>ٹرک نمبر</span><span class="label">${transaction.truckNumber}</span></div>
          <div class="row"><span>رابطہ نمبر</span><span class="label">${transaction.contactNumber}</span></div>
          <div class="row"><span>گاڑی کا خالی وزن</span><span class="label">${transaction.emptyWeight} kg</span></div>
          <div class="row"><span>گاڑی کا لوڈ وزن</span><span class="label">${transaction.loadedWeight} kg</span></div>
          <div class="row"><span>صافی وزن</span><span class="label">${transaction.netWeight} kg</span></div>
          <div class="row"><span>فی کلو ریٹ</span><span class="label">PKR ${transaction.ratePerKg || transaction.ratePerMaund || 'N/A'}</span></div>
          <div class="row"><span>کل رقم</span><span class="label">PKR ${transaction.totalAmount}</span></div>
          <div class="row"><span>پرانا بیلنس</span><span class="label">PKR ${transaction.oldBalance}</span></div>
          <div class="row"><span>ایڈوانس</span><span class="label">PKR ${transaction.advancePaid}</span></div>
          <div class="row"><span>اب ادا کیا</span><span class="label">PKR ${transaction.paidNow || 0}</span></div>
          ${transaction.returnPayment ? `<div class="row" style="background: #fee2e2;"><span>واپسی ادائیگی / Return Payment</span><span class="label" style="color: #dc2626; font-weight: bold;">PKR ${transaction.returnPayment}</span></div>` : ''}
          <div class="row"><span>ادائیگی کا طریقہ</span><span class="label">${transaction.paymentMethod === 'cash' ? 'نقد / Cash' : 'بینک / Bank'}</span></div>
          <div class="total">باقیا / Final Balance: PKR ${transaction.finalBalance}</div>
          ${transaction.shedLocation ? `<div style="margin-top: 20px; text-align: center;">سائیٹ: ${transaction.shedLocation}</div>` : ''}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">For Inquiries / استفسار کے لیے:</div>
            <div style="display: flex; justify-content: space-around; margin-top: 15px;">
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">QAISER</div>
                <div style="font-size: 16px; margin-top: 5px;">03139393024</div>
              </div>
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">AMIR</div>
                <div style="font-size: 16px; margin-top: 5px;">03129425325</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printEntryReceipt = (entry) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('❌ Could not open print window. Please allow popups for this site in your browser settings.');
      return;
    }
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>Entry Receipt ${entry.entryNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; }
            .invoice-type { background: #10b981; color: white; padding: 8px; margin: 15px 0; text-align: center; }
            .row { display: flex; justify-content: space-between; padding: 8px 5px; border-bottom: 1px solid #ddd; }
            .label { font-weight: bold; }
            .total { background: #10b981; color: white; padding: 12px; margin-top: 15px; font-size: 20px; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Qaiser </div>
            <div>Poultry Farm / پولٹری فارم</div>
          </div>
          <div class="invoice-type">ENTRY RECEIPT - Driver Copy</div>
          <div class="row"><span>رسید نمبر</span><span class="label">${entry.entryNumber}</span></div>
          <div class="row"><span>تاریخ / Date</span><span class="label">${entry.entryDate} ${entry.entryTime}</span></div>
          <div class="row"><span>ڈرائیور کا نام</span><span class="label">${entry.customerName}</span></div>
          <div class="row"><span>ٹرک نمبر</span><span class="label">${entry.truckNumber}</span></div>
          <div class="row"><span>رابطہ نمبر</span><span class="label">${entry.contactNumber}</span></div>
          <div class="row"><span>گاڑی کا خالی وزن</span><span class="label">${entry.emptyWeight} kg</span></div>
          <div class="row"><span>ایڈوانس ادائیگی</span><span class="label">PKR ${entry.advancePayment || 0}</span></div>
          <div class="total">Entry Completed - Please proceed to loading</div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">For Inquiries / استفسار کے لیے:</div>
            <div style="display: flex; justify-content: space-around; margin-top: 15px;">
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">QAISER</div>
                <div style="font-size: 16px; margin-top: 5px;">03139393024</div>
              </div>
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">AMIR</div>
                <div style="font-size: 16px; margin-top: 5px;">03129425325</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printAllTransactions = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to print for this date!');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('❌ Could not open print window. Please allow popups for this site in your browser settings.');
      return;
    }

    const totalAmount = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const totalWeight = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight), 0);
    const totalBalance = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.finalBalance), 0);

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>Daily Report - ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; }
            .date-header { background: #10b981; color: white; padding: 12px; margin: 15px 0; text-align: center; font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #333; color: white; padding: 10px; text-align: right; border: 1px solid #000; }
            td { padding: 8px; border: 1px solid #ddd; text-align: right; }
            tr:nth-child(even) { background: #f9f9f9; }
            .summary { background: #10b981; color: white; padding: 15px; margin-top: 20px; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 16px; }
            .summary-row strong { font-size: 18px; }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Qaiser Poultry Farm</div>
            <div>پولٹری فارم</div>
          </div>
          <div class="date-header">Daily Transaction Report - ${new Date(selectedDate).toLocaleDateString('en-GB')} | روزانہ رپورٹ</div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رسید نمبر<br/>Entry #</th>
                <th>نام<br/>Name</th>
                <th>ٹرک نمبر<br/>Truck</th>
                <th>رابطہ<br/>Contact</th>
                <th>وزن (کلو)<br/>Weight (kg)</th>
                <th>ریٹ (PKR/kg)<br/>Rate</th>
                <th>کل رقم<br/>Total (PKR)</th>
                <th>ادائیگی<br/>Payment</th>
                <th>بیلنس<br/>Balance (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map((trans, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${trans.entryNumber}</strong></td>
                  <td>${trans.customerName}</td>
                  <td>${trans.truckNumber}</td>
                  <td>${trans.contactNumber}</td>
                  <td><strong>${trans.netWeight}</strong></td>
                  <td>${trans.ratePerKg || trans.ratePerMaund || 'N/A'}</td>
                  <td><strong>${trans.totalAmount}</strong></td>
                  <td>${trans.paymentMethod === 'cash' ? 'نقد' : trans.paymentMethod === 'bank' ? 'بینک' : 'نقد'}</td>
                  <td style="color: ${parseFloat(trans.finalBalance) > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${trans.finalBalance}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Total Transactions / کل لین دین:</span>
              <strong>${filteredTransactions.length}</strong>
            </div>
            <div class="summary-row">
              <span>Total Weight / کل وزن:</span>
              <strong>${totalWeight.toFixed(0)} kg</strong>
            </div>
            <div class="summary-row">
              <span>Total Amount / کل رقم:</span>
              <strong>PKR ${totalAmount.toFixed(0)}</strong>
            </div>
            <div class="summary-row">
              <span>Total Outstanding Balance / کل باقی رقم:</span>
              <strong style="color: ${totalBalance > 0 ? '#fef3c7' : '#d1fae5'};">PKR ${totalBalance.toFixed(0)}</strong>
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">For Inquiries / استفسار کے لیے:</div>
            <div style="display: flex; justify-content: space-around; margin-top: 15px;">
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">QAISER</div>
                <div style="font-size: 16px; margin-top: 5px;">03139393024</div>
              </div>
              <div style="text-align: center;">
                <div style="font-weight: bold; font-size: 18px;">AMIR</div>
                <div style="font-size: 16px; margin-top: 5px;">03129425325</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Printed on: ${new Date().toLocaleString()} | Qaiser Poultry Farm Management System
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('⚠️ Are you sure you want to delete this entry?')) {
      try {
        await api.deleteEntry(id);
        loadPendingEntries();
        alert('✅ Entry deleted successfully!');
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('❌ Failed to delete entry. Please try again.');
      }
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('⚠️ Are you sure you want to delete this transaction? This will affect customer balance.')) {
      try {
        await api.deleteTransaction(id);
        loadTransactions();
        loadCustomers();
        alert('✅ Transaction deleted successfully!');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('❌ Failed to delete transaction. Please try again.');
      }
    }
  };

  // Edit Transaction
  const handleEditTransaction = (trans) => {
    setEditingTransaction({
      _id: trans._id,
      loadedWeight: trans.loadedWeight,
      ratePerKg: trans.ratePerKg || trans.ratePerMaund,
      paidNow: trans.paidNow || 0,
      returnPayment: trans.returnPayment || 0,
      shedLocation: trans.shedLocation || '',
      paymentMethod: trans.paymentMethod || 'cash'
    });
  };

  const saveTransactionEdit = async () => {
    if (!editingTransaction) return;
    
    try {
      await api.updateTransaction(editingTransaction._id, editingTransaction);
      setEditingTransaction(null);
      loadTransactions();
      loadCustomers();
      alert('✅ Transaction updated successfully!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('❌ Failed to update transaction. Please try again.');
    }
  };

  // Edit Customer
  const handleEditCustomer = (cust) => {
    setEditingCustomer({
      _id: cust._id,
      name: cust.name,
      contactNumber: cust.contactNumber,
      balance: cust.balance
    });
  };

  const saveCustomerEdit = async () => {
    if (!editingCustomer) return;
    
    try {
      await api.updateCustomer(editingCustomer._id, {
        name: editingCustomer.name,
        contactNumber: editingCustomer.contactNumber,
        balance: editingCustomer.balance
      });
      setEditingCustomer(null);
      loadCustomers();
      alert('✅ Customer updated successfully!');
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('❌ Failed to update customer. Please try again.');
    }
  };

  // Calculate Analytics
  const getAnalytics = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => 
      new Date(t.exitDate).toISOString().split('T')[0] === today
    );

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.exitDate);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    return {
      todayRevenue: todayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0),
      todayWeight: todayTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight), 0),
      todayCount: todayTransactions.length,
      monthRevenue: monthTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0),
      monthWeight: monthTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight), 0),
      monthCount: monthTransactions.length,
      totalOutstanding: customers.reduce((sum, c) => sum + (parseFloat(c.balance) > 0 ? parseFloat(c.balance) : 0), 0),
      customersWithBalance: customers.filter(c => parseFloat(c.balance) > 0).length
    };
  };

  const analytics = getAnalytics();

  // ✅ PIN LOCK SCREEN
  if (!isUnlocked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1e293b' }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🐔</div>
          <h2 style={{ margin: '0 0 4px', color: '#1e293b' }}>Qaiser </h2>
          <p style={{ margin: '0 0 30px', color: '#64748b', fontSize: '14px' }}>پولٹری فارم مینجمنٹ سسٹم</p>

          <div style={{ fontSize: '36px', marginBottom: '20px' }}>🔒</div>
          <p style={{ color: '#475569', marginBottom: '16px', fontWeight: '600' }}>Enter PIN to unlock</p>

          <input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            autoFocus
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '28px',
              letterSpacing: '12px',
              textAlign: 'center',
              border: pinError ? '2px solid #dc2626' : '2px solid #e2e8f0',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '8px'
            }}
          />

          {pinError && <p style={{ color: '#dc2626', margin: '0 0 12px', fontSize: '14px', fontWeight: '600' }}>{pinError}</p>}
          {!pinError && <div style={{ height: '20px' }}></div>}

          <button
            onClick={verifyPin}
            disabled={pinLoading || !pin}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: pinLoading || !pin ? '#94a3b8' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: pinLoading || !pin ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {pinLoading ? 'Verifying...' : 'Unlock / کھولیں'}
          </button>
        </div>
      </div>
    );
  }

  // ✅ MAIN APP
  return (
    <div className="app">
      <div className="header">
        <h1>🐔 Qaiser Poultry Farm Management System</h1>
        <p>پولٹری فارم مینجمنٹ سسٹم</p>
      </div>

      {/* Analytics Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        padding: '20px',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ backgroundColor: '#10b981', color: 'white', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Today's Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>PKR {analytics.todayRevenue.toLocaleString()}</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{analytics.todayCount} transactions</div>
        </div>
        <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>This Month</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>PKR {analytics.monthRevenue.toLocaleString()}</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{analytics.monthCount} transactions</div>
        </div>
        <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Outstanding Balance</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>PKR {analytics.totalOutstanding.toLocaleString()}</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{analytics.customersWithBalance} customers</div>
        </div>
        <div style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Pending Entries</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{entries.length}</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>awaiting exit</div>
        </div>
      </div>

      <div className="container">
        <div className="tabs">
          <button className={activeTab === 'entry' ? 'tab active' : 'tab'} onClick={() => setActiveTab('entry')}>
            <LogIn size={20} /> Entry / انٹری
          </button>
          <button className={activeTab === 'exit' ? 'tab active' : 'tab'} onClick={() => setActiveTab('exit')}>
            <LogOut size={20} /> Exit / ایگزٹ
          </button>
          <button className={activeTab === 'pending' ? 'tab active' : 'tab'} onClick={() => setActiveTab('pending')}>
            Pending ({entries.length})
          </button>
          <button className={activeTab === 'completed' ? 'tab active' : 'tab'} onClick={() => setActiveTab('completed')}>
            <FileText size={20} /> Completed ({transactions.length})
          </button>
          <button className={activeTab === 'customers' ? 'tab active' : 'tab'} onClick={() => setActiveTab('customers')}>
            <Users size={20} /> Customers ({customers.length})
          </button>
        </div>

        <div className="content">
          {activeTab === 'entry' && (
            <div className="form">
              <h2>Entry Invoice / انٹری انوائس</h2>
              
              {!customerType && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => setCustomerType('new')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ New Customer<br/>نیا کسٹمر
                  </button>
                  <button 
                    onClick={() => setCustomerType('existing')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    👤 Existing Customer<br/>موجودہ کسٹمر
                  </button>
                </div>
              )}

              {customerType === 'existing' && !existingCustomerData && (
                <>
                  <h3>Search Existing Customer</h3>
                  <input 
                    type="text" 
                    placeholder="Truck Number / ٹرک نمبر" 
                    value={entryForm.truckNumber} 
                    onChange={(e) => setEntryForm({...entryForm, truckNumber: e.target.value})} 
                    style={{ marginBottom: '15px' }}
                  />
                  <button 
                    onClick={searchExistingCustomer}
                    disabled={searchLoading || !entryForm.truckNumber}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '20px',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <Search size={20} />
                    {searchLoading ? 'Searching...' : 'Search Customer / تلاش کریں'}
                  </button>
                  <button 
                    onClick={() => {
                      setCustomerType(null);
                      resetEntryForm();
                    }}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    ← Back
                  </button>
                </>
              )}

              {((customerType === 'new') || (customerType === 'existing' && existingCustomerData)) && (
                <>
                  {existingCustomerData && (
                    <div style={{
                      backgroundColor: '#dbeafe',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      border: '2px solid #3b82f6'
                    }}>
                      <strong>Existing Customer Details:</strong><br/>
                      Truck: {existingCustomerData.truckNumber}<br/>
                      Name: {existingCustomerData.name}<br/>
                      Contact: {existingCustomerData.contactNumber}<br/>
                      <span style={{ color: existingCustomerData.balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>
                        Old Balance: PKR {existingCustomerData.balance > 0 ? `-${existingCustomerData.balance}` : existingCustomerData.balance || 0} 
                        {existingCustomerData.balance > 0 ? ' (Debit/قرض)' : ' (Credit/جمع)'}
                      </span>
                    </div>
                  )}
                  
                  <input 
                    type="text" 
                    placeholder="Truck Number / ٹرک نمبر" 
                    value={entryForm.truckNumber} 
                    onChange={(e) => setEntryForm({...entryForm, truckNumber: e.target.value})} 
                    readOnly={customerType === 'existing'}
                  />
                  <input 
                    type="text" 
                    placeholder="Customer Name / نام" 
                    value={entryForm.customerName} 
                    onChange={(e) => setEntryForm({...entryForm, customerName: e.target.value})} 
                  />
                  <input 
                    type="text" 
                    placeholder="Contact Number / رابطہ نمبر" 
                    value={entryForm.contactNumber} 
                    onChange={(e) => setEntryForm({...entryForm, contactNumber: e.target.value})}
                  />
                  <div className="form-row">
                    <input 
                      type="number" 
                      placeholder="Empty Weight (kg)" 
                      value={entryForm.emptyWeight} 
                      onChange={(e) => setEntryForm({...entryForm, emptyWeight: e.target.value})} 
                    />
                    <input 
                      type="number" 
                      placeholder="Advance Payment (PKR)" 
                      value={entryForm.advancePayment} 
                      onChange={(e) => setEntryForm({...entryForm, advancePayment: e.target.value})} 
                    />
                  </div>
                  <button onClick={saveEntry} disabled={loading} className="btn-primary">
                    <Plus size={20} /> {loading ? 'Saving...' : 'Save Entry / محفوظ کریں'}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setCustomerType(null);
                      resetEntryForm();
                    }}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '10px'
                    }}
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'exit' && (
            <div className="form">
              <h2>Exit Invoice / ایگزٹ انوائس</h2>
              <input 
                type="text" 
                placeholder="Truck Number / ٹرک نمبر" 
                value={exitForm.truckNumber} 
                onChange={(e) => setExitForm({...exitForm, truckNumber: e.target.value})} 
              />
              <button 
                onClick={searchExitEntry} 
                disabled={searchLoading || !exitForm.truckNumber} 
                className="btn-search"
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  marginTop: '10px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <Search size={20} /> 
                {searchLoading ? 'Searching...' : 'Search Entry / تلاش کریں'}
              </button>
              
              {selectedEntry && (
                <>
                  <div className="info-box">
                    <p>Customer: {exitForm.customerName} | Empty: {exitForm.emptyWeight} kg | Advance: PKR {exitForm.advancePaid} | Old Balance: PKR {exitForm.oldBalance}</p>
                  </div>
                  <div className="form-row">
                    <input type="number" value={exitForm.emptyWeight} readOnly />
                    <input type="number" placeholder="Loaded Weight (kg)" value={exitForm.loadedWeight} onChange={(e) => setExitForm({...exitForm, loadedWeight: e.target.value})} />
                    <input type="number" value={exitForm.netWeight} readOnly className="highlight" />
                  </div>
                  <div className="form-row">
                    <input type="number" placeholder="Rate per KG / فی کلو ریٹ" value={exitForm.ratePerKg} onChange={(e) => setExitForm({...exitForm, ratePerKg: e.target.value})} />
                    <input type="number" value={exitForm.totalAmount} readOnly className="highlight" />
                  </div>
                  <div className="form-row">
                    <input type="number" value={exitForm.oldBalance} readOnly />
                    <input type="number" value={exitForm.advancePaid} readOnly />
                    <input type="number" placeholder="Paid Now" value={exitForm.paidNow} onChange={(e) => setExitForm({...exitForm, paidNow: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <input 
                      type="number" 
                      placeholder="Return Payment / واپسی ادائیگی" 
                      value={exitForm.returnPayment} 
                      onChange={(e) => setExitForm({...exitForm, returnPayment: e.target.value})}
                      style={{ borderColor: exitForm.returnPayment ? '#ef4444' : undefined }}
                    />
                    <input type="number" value={exitForm.finalBalance} readOnly className="final-balance" />
                  </div>
                  <input type="text" placeholder="Shed Location" value={exitForm.shedLocation} onChange={(e) => setExitForm({...exitForm, shedLocation: e.target.value})} />
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Payment Method / ادائیگی کا طریقہ</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setExitForm({...exitForm, paymentMethod: 'cash'})}
                        style={{
                          flex: 1,
                          padding: '12px',
                          backgroundColor: exitForm.paymentMethod === 'cash' ? '#10b981' : '#e5e7eb',
                          color: exitForm.paymentMethod === 'cash' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        💵 Cash / نقد
                      </button>
                      <button
                        onClick={() => setExitForm({...exitForm, paymentMethod: 'bank'})}
                        style={{
                          flex: 1,
                          padding: '12px',
                          backgroundColor: exitForm.paymentMethod === 'bank' ? '#10b981' : '#e5e7eb',
                          color: exitForm.paymentMethod === 'bank' ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        🏦 Bank / بینک
                      </button>
                    </div>
                  </div>

                  <button onClick={saveExit} disabled={loading} className="btn-primary">
                    <LogOut size={20} /> {loading ? 'Processing...' : 'Complete Exit / مکمل کریں'}
                  </button>
                  <button 
                    onClick={() => {
                      resetExitForm();
                      setSelectedEntry(null);
                    }}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '10px'
                    }}
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div>
              <h2>Pending Entries ({entries.length})</h2>
              
              <input 
                type="text" 
                placeholder="🔍 Search by Truck Number, Name, or Contact..." 
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />

              {filteredPendingEntries.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  {pendingSearch ? 'No entries found matching your search.' : 'No pending entries.'}
                </p>
              ) : (
                filteredPendingEntries.map(entry => (
                  <div key={entry._id} className="card">
                    <div><strong>{entry.entryNumber}</strong> - {entry.customerName} ({entry.truckNumber})</div>
                    <div>Contact: {entry.contactNumber} | Empty: {entry.emptyWeight} kg | Advance: PKR {entry.advancePayment || 0}</div>
                    <button onClick={() => handleDeleteEntry(entry._id)} className="btn-delete">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              <h2>Completed Transactions ({transactions.length})</h2>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                />
                <button
                  onClick={() => setSelectedDate('')}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  All Dates
                </button>
              </div>

              <input 
                type="text" 
                placeholder="🔍 Search by Entry #, Truck Number, Name, or Contact..." 
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />

              {filteredTransactions.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={printAllTransactions}
                    style={{
                      flex: 1,
                      padding: '15px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Printer size={20} />
                    Print All ({filteredTransactions.length})
                  </button>
                  <button
                    onClick={exportToCSV}
                    style={{
                      flex: 1,
                      padding: '15px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Download size={20} />
                    Export CSV
                  </button>
                </div>
              )}

              {filteredTransactions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  {completedSearch || selectedDate ? 'No transactions found matching your search/date.' : 'No completed transactions.'}
                </p>
              ) : (
                <>
                  <div style={{ 
                    backgroundColor: '#f0fdf4', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '15px',
                    border: '2px solid #10b981'
                  }}>
                    <strong>Summary:</strong> {filteredTransactions.length} transactions | 
                    Total Weight: {filteredTransactions.reduce((sum, t) => sum + parseFloat(t.netWeight), 0).toFixed(0)} kg | 
                    Total Amount: PKR {filteredTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0).toFixed(0)}
                  </div>
                  
                  {filteredTransactions.map(trans => (
                    <div key={trans._id} className="card">
                      <div><strong>{trans.entryNumber}</strong> - {trans.customerName} ({trans.truckNumber}) | <span style={{ color: '#6b7280' }}>📅 {new Date(trans.exitDate).toLocaleDateString('en-GB')}</span></div>
                      <div>Contact: {trans.contactNumber} | Net: {trans.netWeight} kg | Rate: PKR {trans.ratePerKg || trans.ratePerMaund || 'N/A'}/kg | Total: PKR {trans.totalAmount} | Balance: PKR {trans.finalBalance}</div>
                      <div className="card-actions">
                        <button onClick={() => printInvoice(trans)} className="btn-print">
                          <Printer size={16} /> Print
                        </button>
                        <button onClick={() => handleEditTransaction(trans)} style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Edit size={16} /> Edit
                        </button>
                        <button onClick={() => handleDeleteTransaction(trans._id)} className="btn-delete">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h2>Customers ({customers.length})</h2>
              
              <input 
                type="text" 
                placeholder="🔍 Search by Truck Number, Name, or Contact..." 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />

              <button
                onClick={() => setShowBalanceOnly(!showBalanceOnly)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '20px',
                  backgroundColor: showBalanceOnly ? '#dc2626' : '#f3f4f6',
                  color: showBalanceOnly ? 'white' : '#374151',
                  border: showBalanceOnly ? 'none' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                💰 {showBalanceOnly ? 'Balance Customers ✓' : 'Balance Customers'}
                {showBalanceOnly && <span style={{ fontSize: '13px', fontWeight: 'normal', opacity: 0.85 }}>({filteredCustomers.length})</span>}
              </button>

              {filteredCustomers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  {customerSearch ? 'No customers found matching your search.' : 'No customers yet.'}
                </p>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <div 
                    key={idx} 
                    className="card"
                    onClick={() => setSelectedCustomer(cust)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3>{cust.name}</h3>
                    <div>Truck: {cust.truckNumber} | Contact: {cust.contactNumber}</div>
                    <div>Balance: <strong className={cust.balance > 0 ? 'text-red' : 'text-green'}>PKR {cust.balance}</strong> | Trips: {cust.totalTransactions}</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCustomer(cust);
                      }}
                      style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px'
                      }}
                    >
                      <Edit size={16} /> Edit Customer
                    </button>
                  </div>
                ))
              )}
              
              {/* Customer Details Modal */}
              {selectedCustomer && (
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}
                  onClick={() => setSelectedCustomer(null)}
                >
                  <div 
                    style={{
                      backgroundColor: 'white',
                      padding: '30px',
                      borderRadius: '12px',
                      maxWidth: '600px',
                      width: '90%',
                      maxHeight: '80vh',
                      overflow: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
                      Customer Details
                    </h2>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Name:</strong> {selectedCustomer.name}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Truck Number:</strong> {selectedCustomer.truckNumber}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Contact Number:</strong> {selectedCustomer.contactNumber}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Current Balance:</strong> 
                      <span style={{ 
                        color: selectedCustomer.balance > 0 ? '#dc2626' : '#16a34a', 
                        fontWeight: 'bold',
                        fontSize: '20px',
                        marginLeft: '10px'
                      }}>
                        PKR {selectedCustomer.balance > 0 ? `-${selectedCustomer.balance}` : selectedCustomer.balance || 0}
                        {selectedCustomer.balance > 0 ? ' (Debit/قرض)' : ' (Credit/جمع)'}
                      </span>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Total Trips:</strong> {selectedCustomer.totalTransactions}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Customer Since:</strong> {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Last Updated:</strong> {new Date(selectedCustomer.updatedAt).toLocaleDateString()}
                    </div>

                    <h3 style={{ marginTop: '25px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                      Transaction History
                    </h3>
                    {transactions.filter(t => t.customerId === selectedCustomer._id).length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#6b7280', padding: '15px' }}>No transactions yet</p>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {transactions
                          .filter(t => t.customerId === selectedCustomer._id)
                          .sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate))
                          .map((trans, idx) => (
                            <div key={idx} style={{ 
                              padding: '12px', 
                              marginBottom: '8px', 
                              backgroundColor: '#f9fafb', 
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                {trans.entryNumber} - {new Date(trans.exitDate).toLocaleDateString('en-GB')}
                              </div>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                Weight: {trans.netWeight} kg | Amount: PKR {trans.totalAmount} | Balance: PKR {trans.finalBalance}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        width: '100%',
                        marginTop: '20px',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setEditingTransaction(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Transaction</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Loaded Weight (kg)</label>
              <input 
                type="number" 
                value={editingTransaction.loadedWeight}
                onChange={(e) => setEditingTransaction({...editingTransaction, loadedWeight: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rate per KG</label>
              <input 
                type="number" 
                value={editingTransaction.ratePerKg}
                onChange={(e) => setEditingTransaction({...editingTransaction, ratePerKg: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Paid Now</label>
              <input 
                type="number" 
                value={editingTransaction.paidNow}
                onChange={(e) => setEditingTransaction({...editingTransaction, paidNow: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Return Payment / واپسی ادائیگی</label>
              <input 
                type="number" 
                value={editingTransaction.returnPayment}
                onChange={(e) => setEditingTransaction({...editingTransaction, returnPayment: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Location</label>
              <input 
                type="text" 
                value={editingTransaction.shedLocation}
                onChange={(e) => setEditingTransaction({...editingTransaction, shedLocation: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={saveTransactionEdit}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingTransaction(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setEditingCustomer(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Customer</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Customer Name</label>
              <input 
                type="text" 
                value={editingCustomer.name}
                onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact Number</label>
              <input 
                type="text" 
                value={editingCustomer.contactNumber}
                onChange={(e) => setEditingCustomer({...editingCustomer, contactNumber: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Current Balance: 
                <span style={{ 
                  color: editingCustomer.balance > 0 ? '#dc2626' : '#16a34a', 
                  fontSize: '18px',
                  marginLeft: '10px'
                }}>
                  PKR {editingCustomer.balance}
                </span>
              </label>
              <input 
                type="number" 
                placeholder="New Balance / نیا بیلنس"
                value={editingCustomer.balance}
                onChange={(e) => setEditingCustomer({...editingCustomer, balance: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '16px' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setEditingCustomer({...editingCustomer, balance: '0'})}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✅ Clear Balance (Set to 0)
                </button>
                <button
                  onClick={() => {
                    const paid = prompt('How much did customer pay? / کتنا ادا کیا؟');
                    if (paid && !isNaN(paid)) {
                      const newBalance = parseFloat(editingCustomer.balance) - parseFloat(paid);
                      setEditingCustomer({...editingCustomer, balance: newBalance.toString()});
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  💰 Record Payment
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={saveCustomerEdit}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingCustomer(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;