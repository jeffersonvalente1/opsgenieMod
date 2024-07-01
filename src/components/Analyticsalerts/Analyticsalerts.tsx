import React from 'react';
import { Grid } from '@material-ui/core';
import { WeeklyAlerts } from './WeeklyAlerts';
import { WeeklyAlertsSeverity } from './WeeklyAlertsSeverity';
import { WeeklyAlertsResponders } from './WeeklyAlertsResponder';
import { QuarterlyAlertsResponders } from './QuarterlyAlertsResponder';
import { HourlyAlerts } from './HourlyAlerts';
import { MonthlyAlertsResponders } from './MonthlyAlertsResponder';
import { DailyAlertsResponders } from './DailyAlertsResponder';
import { DailyAlerts } from './DailyAlerts';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import moment from 'moment';
import { opsgenieApiRef } from '../../api';
import { useAsync } from 'react-use';
import { Progress } from '@backstage/core-components';
import { Alert } from '@material-ui/lab';
import { Context, DEFAULT_ALERTS_BUSINESS_HOURS_END, DEFAULT_ALERTS_BUSINESS_HOURS_START } from '../../analyticsalerts';
import { InfoPanel } from '../InfoPanel';
import { WeeklyImpactResponders } from './WeeklyImpactResponder';


export const Analyticsalerts = () => {
  const configApi = useApi(configApiRef);
  const opsgenieApi = useApi(opsgenieApiRef);

  const from = moment().subtract(1, 'month').startOf('week');
  const to = moment();

  const { value: data, loading, error } = useAsync(async () => {
    return Promise.all([
      opsgenieApi.getAlertanalitycs({
        limit: 100,
        query: `createdAt < ${to.valueOf()} AND createdAt > ${from.valueOf()}`
      }),
      opsgenieApi.getTeams(),
    ])
  });

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  const context: Context = {
    from: from,
    to: to,
    alerts: data![0].filter(alert => moment(alert.createdAt).isAfter(from)),
    teams: data![1],
  };

  const businessHours = {
    start: configApi.getOptionalNumber('opsgenie.analytics.businessHours.start') || DEFAULT_ALERTS_BUSINESS_HOURS_START,
    end: configApi.getOptionalNumber('opsgenie.analytics.businessHours.end') || DEFAULT_ALERTS_BUSINESS_HOURS_END,
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <InfoPanel
          title="This graphs cover one year worth of alerts, from the current quarter to the same quarter last year."
          message={
            <ul>
              <li>alerts from {from.format('LL')} to now are used</li>
              <li>Business hours are {businessHours.start} to {businessHours.end}</li>
              <li>Responders are read from the <code>responders</code> alert extra property if defined, or from the "responders" section of an alert.</li>
            </ul>
          }
        />
      </Grid>

      <Grid item md={6} xs={12}>
        <WeeklyAlerts context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <WeeklyAlertsSeverity context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <WeeklyAlertsResponders context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <MonthlyAlertsResponders context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <QuarterlyAlertsResponders context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <DailyAlertsResponders context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <HourlyAlerts context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <DailyAlerts context={context} />
      </Grid>

      <Grid item md={6} xs={12}>
        <WeeklyImpactResponders context={context} />
      </Grid>
    </Grid>
  );
};