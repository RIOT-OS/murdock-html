/*
 * Copyright (C) 2018 Freie Universität Berlin
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Martine Lenders <m.lenders@fu-berlin.de>
 */

function id_attr(id) {
  if (id) {
    return ' id="' + id + '"';
  }
  else {
    return "";
  }
}

function extraclasses_append(extraclasses) {
  if (extraclasses && (extraclasses.length > 0)) {
    return " " + extraclasses.join(" ");
  }
  return "";
}

function bs_row(content, id, extraclasses) {
  return '<div' + id_attr(id) + ' class="row' +
    extraclasses_append(extraclasses) + '">' + content + '</div>';
}

function bs_col(content, width, extraclasses) {
  return '<div class="align-middle col-md-' + width +
    extraclasses_append(extraclasses) + '">' + content + "</div>";
}

function bs_card(title, body, id, status) {
  return '<div' + id_attr(id) + ' class="card m-2 border-' + status + '">' +
                 '<div class="card-header text-white bg-' + status + '">' +
                    title +
                 '</div>' +
                 '<div class="card-body">' + body + '</div>' +
               "</div>"
}

function fa(icon_name) {
  return fa_color(icon_name, "black")
}

function fa_color(icon_name, color) {
  if (icon_name) {
    return '<span class="mx-1" style="font-size: 1rem;color: '+ color +';"><i class="fa fa-' + icon_name + '"></i></span>'
  }
  else {
    return "";
  }
}

function progress_bar(percent) {
  return '<div class="progress" style="margin:3px;">' +
           '<div class="progress-bar progress-bar-striped" ' +
                'role="progressbar" ' +
                'aria-valuenow="' + percent + '" ' +
                'aria-valuemin="0" aria-valuemax="100" ' +
                'style="width:' + percent + '%">' + percent + '%' +
           '</div>' +
         '</div>';
}

function pr_status(status) {
  /* the status parameter is expected to be an object with the following
   * attributes:
   *  - total (optional): total number of jobs to execute for the PR
   *  - passed (optional): total number of jobs already done and passed
   *    for the PR
   *  - failed (optional): total number of jobs already done and failed
   *    for the PR
   *  - eta (required, when total, passed, and failed are provided,
   *    otherwise optional): current ETA for the processing of the PR
   *  - status (optional): a status text for the PR
   *  - failed_jobs (optional): list of jobs (may be of length 0) that are
   *    already done and failed. An object in this list is expected to have
   *    the following attributes:
   *      - name (required): the name of the job
   *      - href (optional): a link to the logfile of the job
   */
  var divider = "";
  var stat_html = "";
  var failed_jobs_html = "";
  var percent = 0;
  var text = null;
  var eta = "";

  if (status.hasOwnProperty('total') &&
      status.hasOwnProperty('passed') &&
      status.hasOwnProperty('failed') &&
      (status.total >= (status.passed + status.failed))) {
    var done = status.passed + status.failed;
    percent = Math.round((done * 100) / status.total);
    text = fa("bar-chart") +
      ' fail: ' + status.failed +
      ' pass: ' + status.passed +
      ' done: ' + done + '/' + status.total;
    eta = fa("clock-o") + ' ' +
          moment.duration(status.eta, "seconds").humanize(true);
  }
  else if (status.status) {
    text = fa("exchange") + ' ' + status.status;
  }

  if (text) {
    stat_html += bs_row(bs_col(progress_bar(percent), 6) +
                        bs_col(text, 4) +
                        bs_col(eta, 2));
  }
  if (status.failed_jobs) {
    if (status.failed_jobs.length > 0) {
      failed_jobs_html += "<h6 class='my-2 mx-1'><strong>Failed jobs:</strong></h6>";
    }
    var gridsize = 4;
    var row_content = "";
    for (var i = 0; i < status.failed_jobs.length; i++) {
      var failed_job = status.failed_jobs[i];
      if ((i > 0) && ((i % gridsize) == 0)) {
        failed_jobs_html += bs_row(row_content);
        row_content = "";
      }
      if (failed_job.href) {
        failed_job.name = '<a class="text-danger link-underline-hover" href="' + failed_job.href + '"> ' +
          failed_job.name + ' </a>';
      }
      row_content += bs_col(failed_job.name, Math.floor(12 / gridsize),
                            ["pr-status-job"]);
    }
    failed_jobs_html += bs_row(row_content);
  }
  return bs_col(divider + stat_html + failed_jobs_html, 12);
}

function add_item(obj, type, pr) {
    var pattern = new RegExp("[0-9]+$")
    var prnum = pattern.exec(pr.url);
    var d = new Date(pr.since * 1000);
    var cl;
    var icon;
    var title;
    var duration = "";
    var runtime_icon = "";
    var status_html = "";


    switch (type) {
        case 0:
            icon = "inbox"
            cl = "secondary";
            break;
        case 1:
            icon = "wrench"
            cl = "primary";
            break;
        case 2:
            if (pr.result == "passed") {
                icon = "check"
                cl = "success";
            }
            else if (pr.result == "errored") {
                icon = "times"
                cl = "danger";
            }
            runtime_icon = "clock-o";
            if (pr.runtime) {
              duration = moment.duration(pr.runtime * -1000).humanize();
            }
            if (pr.status_html) {
              status_html = pr.status_html;
            }
            else if (pr.status) {
              status_html = pr_status(pr.status);
            }
            break;
        default:
            icon = "question"
            cl = "secondary";
            break;
    }
    if (type == 2) {
        title = fa_color(icon, "white") + '<span><a class="link-light link-underline-hover" href="' + pr.output_url + '">' + pr.title + '</a></span>';
    }
    else {
        title = fa_color(icon, "white") + pr.title;
    }
    var item_content = "";
    if (pr.url) {
      item_content += bs_col(fa("user") + " " + pr.user, 2) +
                      bs_col(fa("link") +
                        ' <a class="link-underline-hover text-' + cl + '" href="' + pr.url + '" target="_blank">' +
                        'PR #' + prnum + '</a>', 2);
    }
    item_content += bs_col(fa("tag") +
                      '<a class="link-underline-hover text-' + cl + '" href="https://github.com/RIOT-OS/RIOT/commit/' +
                      pr.commit + '" target="_blank">' +
                      '<span class="text-' + cl + '"><pre>' + pr.commit.substring(0,7) +
                      '</pre></span></a>', 2) +
                    bs_col(fa("calendar") + " " +
                      d.toLocaleString() + ' <div ' +
                      'class="since" style="display: inline"' +
                      'since="' + (pr.since * 1000) + '"></div>', 4);
    if (duration.length > 0) {
      item_content += bs_col(fa(runtime_icon) + " " + duration, 2);
    }
    var panel_id;
    if (prnum) {
      panel_id = "pr-" + prnum;
    }
    else {
      panel_id = "n-" + pr.since + "-" + pr.commit;
    }
    var status_id = panel_id + "-status";
    obj.append(bs_card(title,
               bs_row(item_content) +
               bs_row(status_html, status_id),
               panel_id, cl));
}

function get_prs() {
  $.ajax({
      url: "https://" + murdockConfig.baseURL + "/api/pull_requests",
      context: $('#pull_requests'),
  }).done(function(prs) {
      $(this).empty()
      if (prs.queued) {
          prs.queued.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.queued.length; i++) {
              add_item($(this), 0, prs.queued[i]);
          }
      }
      if (prs.building) {
          prs.building.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.building.length; i++) {
              add_item($(this), 1, prs.building[i]);
          }
      }
      if (prs.finished) {
          prs.finished.sort(function(a,b){ return b.since - a.since });
          for (i = 0; i < prs.finished.length; i++) {
              add_item($(this), 2, prs.finished[i]);
          }
      }
      update_durations();
  });
}

function build_branches_menu(active_branch) {
  var branches = [{name: "master"}]; /* TODO get from server */
  var branches_menu = $("#branches-menu");

  if (!active_branch) {
    var active_branch = location.hash.substr(1);

    if (branches.filter(branch => branch.name == active_branch).length == 0) {
      active_branch = murdockConfig.default_branch;
    }
  }
  branches_menu.empty();
  branches.forEach(function(branch) {
    var branch_entry = $('<li class="nav-item m-1"></li>');
    var branch_link = $('<a class="nav-link" aria-current="page" href="#' + branch.name + '">' + branch.name + '</a>');
    if (branch.name == active_branch) {
      branch_link.addClass("active");
    }
    else {
      branch_link.click(function (ev) {
        build_branches_menu(branch.name);
        get_nightlies(ev, branch.name);
      })
    }
    branch_entry.append(branch_link);
    branches_menu.append(branch_entry);
  });
}

function get_nightlies(ev, branch) {
  var nightlies = $('#nightlies');
  if (!branch) {
    branch = murdockConfig.default_branch;
  }
  nightlies.empty()
  $.ajax({
    url: "https://" + murdockConfig.baseURL + "/" + murdockConfig.repo_path +
         "/" + branch + "/nightlies.json",
    context: nightlies,
  }).done(function(nightlies) {
    for (i = 0; i < nightlies.length; i++) {
      nightlies[i].title = new Date(nightlies[i].since * 1000).toLocaleDateString(
          navigator.language,
          {weekday: "short", year: "numeric", month: "short", day: "numeric"}
        ) + " (" + nightlies[i].commit.substring(0, 7) + ")";
      nightlies[i].output_url = "https://" + murdockConfig.baseURL + "/" +
            murdockConfig.repo_path + "/" + branch + "/" + nightlies[i].commit +
            "/output.html";
      add_item($(this), 2, nightlies[i]);
    }
    update_durations();
  });
}

function update_status(event) {
  var msg = JSON.parse(event.data);
  if (msg.cmd == "reload_prs") {
    get_prs();
  }
  else if (msg.cmd == "prstatus") {
    var prnum = msg.prnum;
    var html;
    if (msg.html) {
      html = msg.html;
    }
    else if (msg.status) {
      html = pr_status(msg.status);
    }
    $('#pr-' + prnum + '-status').html(html);
  }
}

function connect_status(f) {
  // setup websocket with callbacks
  var ws = new WebSocket('wss://' + murdockConfig.baseURL + '/status');
  ws.onopen = f;
  ws.onclose = function() {
    setTimeout(connect_status, 1000);
  };
  ws.onmessage = update_status;
}

function update_durations() {
    var elems = document.querySelectorAll('div.since');
    for(var i=0;i<elems.length;i++) {
        var elem = elems[i];
        d = new Date(parseInt(elem.getAttribute("since")));
        elem.innerHTML = "(" + moment(d).fromNow() + ")";
    }
}
