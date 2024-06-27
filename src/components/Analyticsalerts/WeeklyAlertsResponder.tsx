import React from 'react';
import { InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { alertanalyticsApiRef, Context } from '../../analyticsalerts';
import { SaveAction } from './SaveAction';
import { PeriodByResponderGraph } from './PeriodByResponderGraph';

export const WeeklyAlertsResponders = ({ context }: { context: Context }) => {
  const graphId = "weekly-alerts-responders";
  const analyticsApi = useApi(alertanalyticsApiRef);
  const data = analyticsApi.alertsByWeekAndResponder(context);

  return (
    <InfoCard title="Alerts by week and responder" action={<SaveAction targetRef={graphId} />}>
      <div id={graphId} style={{ width: '100%', height: 450, paddingTop: '1.2rem', paddingRight: '1.2rem' }}>
        <PeriodByResponderGraph data={data!} />
      </div>
    </InfoCard>
  );
};
