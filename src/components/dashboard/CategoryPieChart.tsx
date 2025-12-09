
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { useMemo, useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { CHART_COLORS } from '@/lib/colors';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface PieChartDataPoint {
  name: string;
  value: number;
}
interface CategoryPieChartProps {
  data: PieChartDataPoint[];
  allData: PieChartDataPoint[];
  currencySymbol: string;
}

interface ActiveShapeProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    startAngle?: number;
    endAngle?: number;
    fill?: string;
    payload?: any;
    percent?: number;
    value?: number;
}


const renderActiveShape = (props: ActiveShapeProps, currencySymbol: string) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * (midAngle || 0));
  const cos = Math.cos(-RADIAN * (midAngle || 0));
  const sx = (cx || 0) + ((outerRadius || 0) + 6) * cos;
  const sy = (cy || 0) + ((outerRadius || 0) + 6) * sin;
  const mx = (cx || 0) + ((outerRadius || 0) + 15) * cos;
  const my = (cy || 0) + ((outerRadius || 0) + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 12;
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
        innerRadius={(outerRadius || 0) + 4}
        outerRadius={(outerRadius || 0) + 8}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} className="text-sm fill-foreground">{`${currencySymbol}${value?.toFixed(2)}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={18} textAnchor={textAnchor} className="text-xs fill-muted-foreground">
        {`(${(percent || 0 * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export function CategoryPieChart({ data, allData, currencySymbol }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (data.length === 0) {
    return (
        <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center text-center text-muted-foreground">
                <PieChartIcon className="h-12 w-12" />
                <p className="mt-4">No expense data for this period.</p>
                <p className="text-sm">Add some expenses to see your spending breakdown.</p>
            </div>
        </div>
    );
  }

  const totalAmount = allData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full flex flex-col h-[450px]">
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={(props: ActiveShapeProps) => renderActiveShape(props, currencySymbol)}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                  nameKey="name"
                  onMouseEnter={onPieEnter}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                  formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full">
                 <div className="space-y-2 p-2">
                    {allData.map((item, index) => (
                        <div key={item.name} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-accent">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}/>
                                <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">
                                    {currencySymbol}{item.value.toFixed(2)}
                                </Badge>
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                    ({((item.value / totalAmount) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                 </div>
            </ScrollArea>
        </div>
    </div>
  );
}
