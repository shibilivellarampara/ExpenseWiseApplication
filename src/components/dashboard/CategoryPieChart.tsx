'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { useMemo, useState } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryPieChartProps {
  expenses: EnrichedExpense[];
}

const COLORS = ['#64B5F6', '#81C784', '#FFB74D', '#E57373', '#9575CD', '#4DB6AC', '#FF8A65', '#A1887F', '#F06292'];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-headline text-lg">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-sm">{`$${value.toFixed(2)}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export function CategoryPieChart({ expenses }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
    
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    expenses.forEach(item => {
        const categoryName = item.category?.name || 'Uncategorized';
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + item.amount);
    });
    return Array.from(categoryMap, ([name, value]) => ({ name, value }));
  }, [expenses]);

  if (categoryData.length === 0) {
    return (
        <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center text-center text-muted-foreground">
                <PieChartIcon className="h-12 w-12" />
                <p className="mt-4">No expense data for this month.</p>
                <p className="text-sm">Add some expenses to see your spending breakdown.</p>
            </div>
        </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={categoryData}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={110}
          fill="hsl(var(--primary))"
          dataKey="value"
          nameKey="name"
          onMouseEnter={onPieEnter}
        >
          {categoryData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)"
          }}
          formatter={(value: number) => `$${value.toFixed(2)}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
