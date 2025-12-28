
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from 'recharts';
import { useMemo, useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { CHART_COLORS } from '@/lib/colors';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';

interface PieChartDataPoint {
  name: string;
  value: number;
}
interface CategoryPieChartProps {
  data: PieChartDataPoint[];
  allData: PieChartDataPoint[];
  currencySymbol: string;
  totalAmountForPercentage?: number;
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


const renderActiveShape = (
  props: any,
  currencySymbol: string
) => {
  const RADIAN = Math.PI / 180;
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
    payload,
    percent = 0,
    value = 0,
  } = props;

  if (!value || !payload) return <g />;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Base points
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const mx = cx + (outerRadius + 16) * cos;
  const my = cy + (outerRadius + 16) * sin;

  // Safe bounds
  const CHART_PADDING = 20;
  const SVG_WIDTH = cx * 2;
  const MIN_X = CHART_PADDING;
  const MAX_X = SVG_WIDTH - CHART_PADDING;

  // Estimated text width (rough but reliable)
  const labelText = `${currencySymbol}${value.toFixed(2)}`;
  const estimatedTextWidth = labelText.length * 7;

  let ex = mx + (cos >= 0 ? 12 : -12);

  // Clamp label X
  if (cos >= 0) {
    ex = Math.min(ex, MAX_X - estimatedTextWidth);
  } else {
    ex = Math.max(ex, MIN_X + estimatedTextWidth);
  }

  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      {/* Center label */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fill}
        className="text-base font-semibold"
      >
        {payload.name}
      </text>

      {/* Main slice */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      {/* Highlight ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      {/* Connector */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${my}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={my} r={2} fill={fill} />

      {/* Amount */}
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={my}
        textAnchor={textAnchor}
        className="text-sm fill-foreground"
      >
        {labelText}
      </text>

      {/* Percentage */}
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={my}
        dy={16}
        textAnchor={textAnchor}
        className="text-xs fill-muted-foreground"
      >
        ({(percent * 100).toFixed(2)}%)
      </text>
    </g>
  );
};



export function CategoryPieChart({ data, allData, currencySymbol, totalAmountForPercentage }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const { topData, othersData } = useMemo(() => {
    const topN = 11;
    if (allData.length <= topN) {
      return { topData: allData, othersData: [] };
    }
    const top = allData.slice(0, topN);
    const others = allData.slice(topN);
    return { topData: top, othersData: others };
  }, [allData]);


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

  const totalAmount = totalAmountForPercentage ?? allData.reduce((sum, item) => sum + item.value, 0);
  const safeColors = CHART_COLORS.slice(0, 11);

  return (
    <div className="w-full flex flex-col h-[750px]">
        <div className="h-[250px] w-full overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart
                margin={{ top: 20, right: 90, bottom: 20, left: 90 }}
                style={{ overflow: 'visible' }}
              >
                <Pie
                  activeIndex={activeIndex}
                  activeShape={(props: any) => renderActiveShape(props, currencySymbol)}
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
                    <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? '#B0BEC5' : safeColors[index % safeColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full">
                 <div className="space-y-2 p-2">
                    {allData.map((item, index) => {
                        const isOther = topData.length < allData.length && index >= topData.length;
                        const isAggregatedOther = item.name === 'Others';
                        const color = isAggregatedOther ? '#B0BEC5' : safeColors[index % safeColors.length];

                        if (isAggregatedOther) {
                            return (
                                <Dialog key="others-legend">
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-between items-center text-sm p-2 rounded-md hover:bg-accent h-auto">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="truncate flex-1 text-left">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-mono">
                                                    {currencySymbol}{item.value.toFixed(2)}
                                                </Badge>
                                                {totalAmount > 0 && (
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    ({((item.value / totalAmount) * 100).toFixed(1)}%)
                                                </span>
                                                )}
                                            </div>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Other Categories</DialogTitle>
                                        </DialogHeader>
                                        <ScrollArea className="h-72">
                                            <div className="space-y-2 p-2">
                                                {othersData.map((otherItem) => (
                                                    <div key={otherItem.name} className="flex justify-between items-center text-sm p-2 rounded-md">
                                                        <span>{otherItem.name}</span>
                                                        <Badge variant="secondary" className="font-mono">
                                                            {currencySymbol}{otherItem.value.toFixed(2)}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                            );
                        }

                        if (!isOther) {
                             return (
                                <div key={item.name} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-accent">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}/>
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">
                                            {currencySymbol}{item.value.toFixed(2)}
                                        </Badge>
                                        {totalAmount > 0 && (
                                        <span className="text-xs text-muted-foreground w-12 text-right">
                                            ({((item.value / totalAmount) * 100).toFixed(1)}%)
                                        </span>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                        return null;

                    })}
                 </div>
            </ScrollArea>
        </div>
    </div>
  );
}
