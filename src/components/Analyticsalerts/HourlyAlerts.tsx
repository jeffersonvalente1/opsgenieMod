import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ScatterChart, Scatter
} from 'recharts';
import { InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { analyticsApiRef, Context } from '../../analyticsalerts';
import { SaveAction } from './SaveAction';
import { FilterZeroTooltip } from './FilterZeroTooltip';

const Graph = ({ context }: { context: Context }) => {
  const analyticsApi = useApi(analyticsApiRef);
  const dataPoints = analyticsApi.alertsByHour(context);

  return (
    <div id="hourly-alerts" style={{ width: '100%', height: 300, paddingTop: '1.2rem', paddingRight: '1.2rem' }}>
      <ResponsiveContainer>
        <ScatterChart data={dataPoints}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" name="Hour" unit="h" />
          <YAxis dataKey="total" name="Total" />
          <Tooltip content={<FilterZeroTooltip />} />
          <Scatter name="Hour" data={dataPoints} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HourlyAlerts = ({ context }: { context: Context }) => {
  return (
    <InfoCard title="Alerts by hour" action={<SaveAction targetRef="hourly-alerts" />}>
      <Graph context={context} />
    </InfoCard>
  );
};
