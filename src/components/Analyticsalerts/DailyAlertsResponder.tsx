import React from 'react';
import { InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { alertanalyticsApiRef, Context } from '../../analyticsalerts';
import { SaveAction } from './SaveAction';
import { PeriodByResponderGraph } from './PeriodByResponderGraph';

export const DailyAlertsResponders = ({ context }: { context: Context }) => {
  const graphId = "daily-alerts-responders";
  const analyticsApi = useApi(alertanalyticsApiRef);
  const data = analyticsApi.alertsByDayAndResponder(context);

  return (
    <InfoCard title="Alerts by day and responder" action={<SaveAction targetRef={graphId} />}>
      <div id={graphId} style={{ width: '100%', height: 450, paddingTop: '1.2rem', paddingRight: '1.2rem' }}>
        <PeriodByResponderGraph data={data!} />
      </div>
    </InfoCard>
  );
};
