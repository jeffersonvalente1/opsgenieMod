import React from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { analyticsApiRef, Context } from '../../analyticsalerts';
import { SaveAction } from './SaveAction';
import { FilterZeroTooltip } from './FilterZeroTooltip';

const Graph = ({ context }: { context: Context }) => {
  const analyticsApi = useApi(analyticsApiRef);
  const dataPoints = analyticsApi.alertsByWeekAndSeverity(context);

  return (
    <div id="weekly-alerts-severity" style={{ width: '100%', height: 300, paddingTop: '1.2rem', paddingRight: '1.2rem' }}>
      <ResponsiveContainer>
        <ComposedChart data={dataPoints}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Bar dataKey="p1" fill="#bf2600" name="P1 - Critical" stackId="a" barSize={30} />
          <Bar dataKey="p2" fill="#ff7452" name="P2 - High" stackId="a" barSize={30} />
          <Bar dataKey="p3" fill="#ffab00" name="P3 - Moderate" stackId="a" barSize={30} />
          <Bar dataKey="p4" fill="#36b37e" name="P4 - Low" stackId="a" barSize={30} />
          <Bar dataKey="p5" fill="#00857A" name="P5 - Informational" stackId="a" barSize={30} />
          <Tooltip content={<FilterZeroTooltip />} />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeeklyAlertsSeverity = ({ context }: { context: Context }) => {
  return (
    <InfoCard title="Alerts by week and severity" action={<SaveAction targetRef="weekly-alerts-severity" />}>
      <Graph context={context} />
    </InfoCard>
  );
};
