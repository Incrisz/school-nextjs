"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Admin Dashboard</h3>
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Admin</li>
        </ul>
      </div>

      <div className="row gutters-20">
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="dashboard-summery-one mg-b-20">
            <div className="row align-items-center">
              <div className="col-6">
                <div className="item-icon bg-light-green ">
                  <i className="flaticon-classmates text-green" />
                </div>
              </div>
              <div className="col-6">
                <div className="item-content">
                  <div className="item-title">Students</div>
                  <div className="item-number">
                    <span className="counter" data-num="150000">
                      1,50,000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="dashboard-summery-one mg-b-20">
            <div className="row align-items-center">
              <div className="col-6">
                <div className="item-icon bg-light-blue">
                  <i className="flaticon-multiple-users-silhouette text-blue" />
                </div>
              </div>
              <div className="col-6">
                <div className="item-content">
                  <div className="item-title">Teachers</div>
                  <div className="item-number">
                    <span className="counter" data-num="2250">
                      2,250
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="dashboard-summery-one mg-b-20">
            <div className="row align-items-center">
              <div className="col-6">
                <div className="item-icon bg-light-yellow">
                  <i className="flaticon-couple text-orange" />
                </div>
              </div>
              <div className="col-6">
                <div className="item-content">
                  <div className="item-title">Parents</div>
                  <div className="item-number">
                    <span className="counter" data-num="5690">
                      5,690
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="dashboard-summery-one mg-b-20">
            <div className="row align-items-center">
              <div className="col-6">
                <div className="item-icon bg-light-red">
                  <i className="flaticon-money text-red" />
                </div>
              </div>
              <div className="col-6">
                <div className="item-content">
                  <div className="item-title">Earnings</div>
                  <div className="item-number">
                    <span>$</span>
                    <span className="counter" data-num="193000">
                      1,93,000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gutters-20">
        <div className="col-12 col-xl-8 col-6-xxxl">
          <div className="card dashboard-card-one pd-b-20">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Earnings</h3>
                </div>
                <div className="dropdown">
                  <a
                    className="dropdown-toggle"
                    href="#"
                    role="button"
                    data-toggle="dropdown"
                    aria-expanded="false"
                  >
                    ...
                  </a>

                  <div className="dropdown-menu dropdown-menu-right">
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-times text-orange-red" />
                      Close
                    </a>
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-cogs text-dark-pastel-green" />
                      Edit
                    </a>
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-redo-alt text-orange-peel" />
                      Refresh
                    </a>
                  </div>
                </div>
              </div>
              <div className="earning-report">
                <div className="item-content">
                  <div className="single-item pseudo-bg-blue">
                    <h4>Total Collections</h4>
                    <span>75,000</span>
                  </div>
                  <div className="single-item pseudo-bg-red">
                    <h4>Total Earnings</h4>
                    <span>60,000</span>
                  </div>
                </div>
                <div id="earning-line-chart" className="earning-line-chart" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4 col-3-xxxl">
          <div className="card dashboard-card-three pd-b-20">
            <div className="card-body">
              <div className="heading-layout1 mg-b-17">
                <div className="item-title">
                  <h3>Event Calender</h3>
                </div>
                <div className="dropdown">
                  <a
                    className="dropdown-toggle"
                    href="#"
                    role="button"
                    data-toggle="dropdown"
                    aria-expanded="false"
                  >
                    ...
                  </a>

                  <div className="dropdown-menu dropdown-menu-right">
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-times text-orange-red" />
                      Close
                    </a>
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-cogs text-dark-pastel-green" />
                      Edit
                    </a>
                    <a className="dropdown-item" href="#">
                      <i className="fas fa-redo-alt text-orange-peel" />
                      Refresh
                    </a>
                  </div>
                </div>
              </div>
              <div className="calender-wrap">
                <div id="fc-calender" className="fc-calender" />
              </div>
              <div className="d-none d-xl-block">
                <div className="divider" />
                <div className="events">
                  <div className="event-wrapper">
                    <div className="event-btn">
                      <a className="event-btn-1" href="#">
                        Today Events
                      </a>
                      <a className="event-btn-2" href="#">
                        Monthly Events
                      </a>
                    </div>
                    <div className="table-responsive">
                      <table className="table display data-table text-nowrap">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th>Time</th>
                            <th>Venue</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>School picnic</td>
                            <td>09:30 am - 04:30 pm</td>
                            <td>Monitu Chandi</td>
                          </tr>
                          <tr>
                            <td>School picnic</td>
                            <td>09:30 am - 04:30 pm</td>
                            <td>Monitu Chandi</td>
                          </tr>
                          <tr>
                            <td>School picnic</td>
                            <td>09:30 am - 04:30 pm</td>
                            <td>Monitu Chandi</td>
                          </tr>
                          <tr>
                            <td>School picnic</td>
                            <td>09:30 am - 04:30 pm</td>
                            <td>Monitu Chandi</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
