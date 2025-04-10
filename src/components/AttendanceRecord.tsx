import { useState, useEffect } from 'react';

interface AttendanceRecord {
  studentName: string;
  timestamp: string;
  status: 'present' | 'absent';
}

export function AttendanceRecord() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // 加载考勤记录
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await fetch(`/api/attendance?date=${selectedDate}`);
        const data = await response.json();
        setRecords(data);
      } catch (error) {
        console.error('Error loading attendance records:', error);
      }
    };

    loadRecords();
  }, [selectedDate]);

  // 导出考勤记录
  const exportRecords = () => {
    const csvContent = [
      ['学生姓名', '时间', '状态'],
      ...records.map(record => [
        record.studentName,
        record.timestamp,
        record.status === 'present' ? '出席' : '缺席'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考勤记录_${selectedDate}.csv`;
    link.click();
  };

  return (
    <div className="attendance-record">
      <h2>考勤记录</h2>
      
      <div className="date-selector">
        <label htmlFor="date">选择日期：</label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="records-table">
        <table>
          <thead>
            <tr>
              <th>学生姓名</th>
              <th>时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index}>
                <td>{record.studentName}</td>
                <td>{new Date(record.timestamp).toLocaleString()}</td>
                <td>{record.status === 'present' ? '出席' : '缺席'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={exportRecords} className="export-button">
        导出考勤记录
      </button>
    </div>
  );
} 