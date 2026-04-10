'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/dashboard-summary')
      .then(res => res.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">数据库连接诊断</h1>
      {loading ? (
        <p>正在加载诊断信息...</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded border">
            <h2 className="font-bold">连接元数据</h2>
            <pre className="text-xs mt-2">{JSON.stringify(info?.debug || {}, null, 2)}</pre>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded bg-white shadow-sm">
              <div className="text-slate-500 text-sm">活动异常</div>
              <div className="text-3xl font-bold">{info?.activeIssuesCount}</div>
            </div>
            <div className="p-4 border rounded bg-white shadow-sm">
              <div className="text-slate-500 text-sm">今日产出</div>
              <div className="text-3xl font-bold">{info?.todayGoodQty}</div>
            </div>
            <div className="p-4 border rounded bg-white shadow-sm">
              <div className="text-slate-500 text-sm">库存预警</div>
              <div className="text-3xl font-bold">{info?.lowStockCount}</div>
            </div>
            <div className="p-4 border rounded bg-white shadow-sm">
              <div className="text-slate-500 text-sm">近期订单总数 (查询结果)</div>
              <div className="text-3xl font-bold">{info?.recentOrders?.length}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded border shadow-sm">
            <h2 className="font-bold mb-2">近期订单明细 (原始数据)</h2>
            <div className="space-y-2">
              {info?.recentOrders?.map((o: any) => (
                <div key={o.orderNo} className="text-sm border-b pb-1">
                  {o.orderNo} - {o.customerName} - {o.status} - {o.createdAt}
                </div>
              ))}
              {(!info?.recentOrders || info.recentOrders.length === 0) && <p className="text-slate-400">暂无数据</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
