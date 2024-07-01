import { createApiRef } from '@backstage/core-plugin-api';
import moment from 'moment';
import { Alertanalitycs, Team } from './types';

const UNKNOWN_TEAM_NAME = "Unknown";

export const DEFAULT_ALERTS_BUSINESS_HOURS_START = 9;
export const DEFAULT_ALERTS_BUSINESS_HOURS_END = 18;

export const alertanalyticsApiRef = createApiRef<AnalitycsalertsApi>({
  id: 'plugin.opsgenie.analyticsalerts',
});

const teamName = (teams: Team[], teamId: string): string => {
  for (const team of teams) {
    if (team.id === teamId) {
      return team.name;
    }
  }

  return UNKNOWN_TEAM_NAME;
};

export const respondingTeam = (teams: Team[], alertanalitycs: Alertanalitycs): string => {
//  if (alertanalitycs.extraProperties.responders) {
//    return alertanalitycs.extraProperties.responders;
//  }

  const teamResponders = alertanalitycs.responders.filter((responderRef) => responderRef.type === "team");

  if (teamResponders.length === 0) {
    return UNKNOWN_TEAM_NAME;
  }

  return teamName(teams, teamResponders[0].id);
};

const sortByDate = (data: DateSortable[]): void => {
  data.sort((a, b) => {
    if (a.date < b.date) {
      return -1;
    }
    if (a.date > b.date) {
      return 1;
    }

    return 0;
  });
}

interface DateSortable {
  date: moment.Moment;
}

interface HourlyAlerts {
  hour: string;
  total: number;
}

interface DailyAlerts {
  day: string;
  total: number;
}

interface WeeklyAlertsBySeverity {
  week: string;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  date: moment.Moment;
}

interface WeeklyAlertsByHour {
  week: string;
  businessHours: number;
  onCallHours: number;
  total: number;
  date: moment.Moment;
}

export interface AlertsByResponders {
  dataPoints: { period: string; total: number; date: moment.Moment }[]
  responders: string[];
}

export interface Context {
  from: moment.Moment;
  to: moment.Moment;
  alerts: Alertanalitycs[];
  teams: Team[];
}

export interface AnalyticAlerts {
  alertsByHour(context: Context): HourlyAlerts[];
  alertsByDay(context: Context): DailyAlerts[];

  alertsByWeekAndHours(context: Context): WeeklyAlertsByHour[];
  alertsByWeekAndSeverity(context: Context): WeeklyAlertsBySeverity[];

  alertsByDayAndResponder(context: Context): AlertsByResponders;
  alertsByWeekAndResponder(context: Context): AlertsByResponders;
  alertsByMonthAndResponder(context: Context): AlertsByResponders;
  alertsByQuarterAndResponder(context: Context): AlertsByResponders;

  impactByWeekAndResponder(context: Context): AlertsByResponders;
}

interface BusinessHours {
  start: number;
  end: number;
}

export class AnalitycsalertsApi implements AnalyticAlerts {
  private readonly businessHours: BusinessHours;

  constructor(opts: { businessHours: BusinessHours }) {
    this.businessHours = opts.businessHours;
  }

  alertsByHour(context: Context): HourlyAlerts[] {
    const alertsBuckets: Record<string, number> = {};

    // add empty buckets for hours with no alert
    for (let h = 0; h <= 23; h++) {
      alertsBuckets[h] = 0;
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);

      alertsBuckets[alertDate.hour()] += 1;
    });

    const data = Object.keys(alertsBuckets).map(hour => (
      {
        hour: hour,
        total: alertsBuckets[hour],
      }
    ));

    data.sort((a, b) => parseInt(a.hour, 10) - parseInt(b.hour, 10));

    return data;
  }

  alertsByDay(context: Context): DailyAlerts[] {
    const alertsBuckets: Record<string, number> = {};

    // add empty buckets for days with no alert
    for (let d = 0; d < 7; d++) {
      alertsBuckets[d] = 0;
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);

      alertsBuckets[alertDate.day()] += 1;
    });

    const data = Object.keys(alertsBuckets).map(day => (
      {
        day: moment().day(day).format('dddd'),
        dayNum: parseInt(day, 10),
        total: alertsBuckets[day],
      }
    ));

    // Mondays first.
    data.sort((a, b) => (a.dayNum + 6) % 7 - (b.dayNum + 6) % 7);

    return data;
  }

  alertsByWeekAndSeverity(context: Context): WeeklyAlertsBySeverity[] {
    const alertsBuckets: Record<string, { p1: number, p2: number, p3: number, p4: number, p5: number, date: moment.Moment }> = {};

    const minDate = context.from.clone().startOf('isoWeek');
    const maxDate = context.to.clone().startOf('isoWeek');

    // add empty buckets for weeks with no alert
    while (minDate <= maxDate) {
      const week = `w${minDate.isoWeek()} - ${minDate.year()}`;

      if (!alertsBuckets[week]) {
        alertsBuckets[week] = {
          p1: 0,
          p2: 0,
          p3: 0,
          p4: 0,
          p5: 0,
          date: minDate.clone(),
        };
      }

      minDate.add(1, 'weeks');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const week = `w${alertDate.isoWeek()} - ${alertDate.year()}`;

      if (alert.priority === 'P1') {
        alertsBuckets[week].p1 += 1;
      } else if (alert.priority === 'P2') {
        alertsBuckets[week].p2 += 1;
      } else if (alert.priority === 'P3') {
        alertsBuckets[week].p3 += 1;
      } else if (alert.priority === 'P4') {
        alertsBuckets[week].p4 += 1;
      } else if (alert.priority === 'P5') {
        alertsBuckets[week].p5 += 1;
      }
    });

    const data = Object.keys(alertsBuckets).map(week => (
      {
        week: week,
        p1: alertsBuckets[week].p1,
        p2: alertsBuckets[week].p2,
        p3: alertsBuckets[week].p3,
        p4: alertsBuckets[week].p4,
        p5: alertsBuckets[week].p5,
        date: alertsBuckets[week].date,
      }
    ));

    sortByDate(data);

    return data;
  }

  alertsByWeekAndHours(context: Context): WeeklyAlertsByHour[] {
    const alertsBuckets: Record<string, { businessHours: number, onCallHours: number, total: number, date: moment.Moment }> = {};

    const minDate = context.from.clone().startOf('isoWeek');
    const maxDate = context.to.clone().startOf('isoWeek');

    // add empty buckets for weeks with no alert
    while (minDate <= maxDate) {
      const week = `w${minDate.isoWeek()} - ${minDate.year()}`;

      if (!alertsBuckets[week]) {
        alertsBuckets[week] = {
          businessHours: 0,
          onCallHours: 0,
          total: 0,
          date: minDate.clone(),
        };
      }

      minDate.add(1, 'weeks');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const week = `w${alertDate.isoWeek()} - ${alertDate.year()}`;

      alertsBuckets[week].total += 1;

      if (this.isBusinessHours(alertDate)) {
        alertsBuckets[week].businessHours += 1;
      } else {
        alertsBuckets[week].onCallHours += 1;
      }
    });

    const data = Object.keys(alertsBuckets).map(week => (
      {
        week: week,
        businessHours: alertsBuckets[week].businessHours,
        onCallHours: alertsBuckets[week].onCallHours,
        total: alertsBuckets[week].total,
        date: alertsBuckets[week].date,
      }
    ));

    sortByDate(data);

    return data;
  }

  alertsByDayAndResponder(context: Context): AlertsByResponders {
    const alertsBuckets: Record<string, { responders: Record<string, number>, total: number }> = {};
    const respondersMap: Record<string, boolean> = {};

    // add empty buckets for days with no alert
    for (let d = 0; d < 7; d++) {
      alertsBuckets[d] = {
        total: 0,
        responders: {},
      };
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const day = alertDate.day();
      const responder = respondingTeam(context.teams, alert);

      respondersMap[responder] = true;

      if (!alertsBuckets[day].responders[responder]) {
        alertsBuckets[day].responders[responder] = 0;
      }

      alertsBuckets[day].responders[responder] += 1;
      alertsBuckets[day].total += 1;
    });

    const data = Object.keys(alertsBuckets).map(day => {
      const dataPoint: any = {
        period: moment().day(day).format('dddd'),
        dayNum: parseInt(day, 10),
        total: alertsBuckets[day].total,
      };

      Object.keys(respondersMap).forEach(responder => {
        dataPoint[responder] = alertsBuckets[day].responders[responder] || 0;
      });

      return dataPoint;
    });

    // Mondays first.
    data.sort((a, b) => (a.dayNum + 6) % 7 - (b.dayNum + 6) % 7);

    return {
      dataPoints: data,
      responders: Object.keys(respondersMap),
    };
  }

  alertsByMonthAndResponder(context: Context): AlertsByResponders {
    const alertsBuckets: Record<string, { responders: Record<string, number>, total: number, date: moment.Moment }> = {};
    const respondersMap: Record<string, boolean> = {};

    const from = context.from.clone();
    const to = context.to.clone();

    // add empty buckets for months with no alert
    while (from <= to) {
      const month = `${from.month() + 1}/${from.year()}`;

      if (!alertsBuckets[month]) {
        alertsBuckets[month] = {
          responders: {},
          total: 0,
          date: from.clone(),
        };
      }

      from.add(1, 'month');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const month = `${alertDate.month() + 1}/${alertDate.year()}`;
      const responder = respondingTeam(context.teams, alert);

      respondersMap[responder] = true;

      if (!alertsBuckets[month].responders[responder]) {
        alertsBuckets[month].responders[responder] = 0;
      }

      alertsBuckets[month].responders[responder] += 1;
      alertsBuckets[month].total += 1;
    });

    const data = Object.keys(alertsBuckets).map(month => {
      const dataPoint: any = {
        period: month,
        total: alertsBuckets[month].total,
        date: alertsBuckets[month].date,
      };

      Object.keys(respondersMap).forEach(responder => {
        dataPoint[responder] = alertsBuckets[month].responders[responder] || 0;
      });

      return dataPoint;
    });

    sortByDate(data);

    return {
      dataPoints: data,
      responders: Object.keys(respondersMap),
    };
  }

  alertsByWeekAndResponder(context: Context): AlertsByResponders {
    const alertsBuckets: Record<string, { responders: Record<string, number>, total: number, date: moment.Moment }> = {};
    const respondersMap: Record<string, boolean> = {};

    const minDate = context.from.clone().startOf('isoWeek');
    const maxDate = context.to.clone().startOf('isoWeek');

    // add empty buckets for weeks with no alert
    while (minDate <= maxDate) {
      const week = `w${minDate.isoWeek()} - ${minDate.year()}`;

      if (!alertsBuckets[week]) {
        alertsBuckets[week] = {
          responders: {},
          total: 0,
          date: minDate.clone(),
        };
      }

      minDate.add(1, 'weeks');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const week = `w${alertDate.isoWeek()} - ${alertDate.year()}`;
      const responder = respondingTeam(context.teams, alert);

      respondersMap[responder] = true;

      if (!alertsBuckets[week].responders[responder]) {
        alertsBuckets[week].responders[responder] = 0;
      }

      alertsBuckets[week].responders[responder] += 1;
      alertsBuckets[week].total += 1;
    });

    const data = Object.keys(alertsBuckets).map(week => {
      const dataPoint: any = {
        period: week,
        total: alertsBuckets[week].total,
        date: alertsBuckets[week].date,
      };

      Object.keys(respondersMap).forEach(responder => {
        dataPoint[responder] = alertsBuckets[week].responders[responder] || 0;
      });

      return dataPoint;
    });

    sortByDate(data);

    return {
      dataPoints: data,
      responders: Object.keys(respondersMap),
    };
  }

  alertsByQuarterAndResponder(context: Context): AlertsByResponders {
    const alertsBuckets: Record<string, { responders: Record<string, number>, total: number, date: moment.Moment }> = {};
    const respondersMap: Record<string, boolean> = {};

    const from = context.from.clone();
    const to = context.to.clone();

    // add empty buckets for quarters with no alert (let's be hopeful, might happen)
    while (from <= to) {
      const quarter = `Q${from.quarter()} - ${from.year()}`;

      if (!alertsBuckets[quarter]) {
        alertsBuckets[quarter] = {
          responders: {},
          total: 0,
          date: from.clone(),
        };
      }

      from.add(1, 'quarter');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const quarter = `Q${alertDate.quarter()} - ${alertDate.year()}`;
      const responder = respondingTeam(context.teams, alert);

      respondersMap[responder] = true;

      if (!alertsBuckets[quarter].responders[responder]) {
        alertsBuckets[quarter].responders[responder] = 0;
      }

      alertsBuckets[quarter].responders[responder] += 1;
      alertsBuckets[quarter].total += 1;
    });


    const data = Object.keys(alertsBuckets).map(quarter => {
      const dataPoint: any = {
        period: quarter,
        total: alertsBuckets[quarter].total,
        date: alertsBuckets[quarter].date,
      };

      Object.keys(respondersMap).forEach(responder => {
        dataPoint[responder] = alertsBuckets[quarter].responders[responder] || 0;
      });

      return dataPoint;
    });

    sortByDate(data);

    return {
      dataPoints: data,
      responders: Object.keys(respondersMap),
    };
  }

  impactByWeekAndResponder(context: Context): AlertsByResponders {
    const alertsBuckets: Record<string, { responders: Record<string, number[]>, durations: number[], date: moment.Moment }> = {};
    const respondersMap: Record<string, boolean> = {};

    const minDate = context.from.clone().startOf('isoWeek');
    const maxDate = context.to.clone().startOf('isoWeek');

    const average = (durations: number[]) => durations.length === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / durations.length;

    // add empty buckets for weeks with no alert
    while (minDate <= maxDate) {
      const week = `w${minDate.isoWeek()} - ${minDate.year()}`;

      if (!alertsBuckets[week]) {
        alertsBuckets[week] = {
          responders: {},
          durations: [],
          date: minDate.clone(),
        };
      }

      minDate.add(1, 'weeks');
    }

    context.alerts.forEach(alert => {
      const alertDate = moment(alert.createdAt);
      const alertEnd = moment(alert.updatedAt);
      const week = `w${alertDate.isoWeek()} - ${alertDate.year()}`;
      const responder = respondingTeam(context.teams, alert);
      const impactDuration = alertEnd.diff(alertDate, 'minutes');

      respondersMap[responder] = true;

      if (!alertsBuckets[week].responders[responder]) {
        alertsBuckets[week].responders[responder] = [];
      }

      alertsBuckets[week].responders[responder].push(impactDuration);
      alertsBuckets[week].durations.push(impactDuration);
    });

    const data = Object.keys(alertsBuckets).map(week => {
      const dataPoint: any = {
        period: week,
        total: average(alertsBuckets[week].durations),
        date: alertsBuckets[week].date,
      };

      Object.keys(respondersMap).forEach(responder => {
        dataPoint[responder] = alertsBuckets[week].responders[responder] ? average(alertsBuckets[week].responders[responder]) : 0;
      });

      return dataPoint;
    });

    sortByDate(data);

    return {
      dataPoints: data,
      responders: Object.keys(respondersMap),
    };
  }

  isBusinessHours(alertStartedAt: moment.Moment): boolean {
    return alertStartedAt.hour() >= this.businessHours.start && alertStartedAt.hour() < this.businessHours.end;
  }
}