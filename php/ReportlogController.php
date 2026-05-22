<?php

namespace app\modules\dimension\reportLog\controllers;

use app\modules\dimension\reportLog\fns\ReportlogFn;
use support\Request;

class ReportlogController
{

    /**
     * Summary of index
     * @param \support\Request $request
     * @return \support\Response
     */
    public function index(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        $list = $ReportlogFn->index($all, $request->limit, $request->offset);
        return success($list);
    }

    /**
     * Summary of create
     * @param \support\Request $request
     * @return \support\Response
     */
    public function create(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        $all['jwtStoresId'] = $request->jwtStoresId;
        $id = $ReportlogFn->create($all);
        return success($id);
    }
    public function show(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        return success($ReportlogFn->show($all));
    }
    public function delete(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        return success($ReportlogFn->delete($all));
    }
    public function submit(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        return success($ReportlogFn->submit($all));
    }
    public function rapid(Request $request, ReportlogFn $ReportlogFn)
    {
        $all = $request->all();
        $all['jwtUserId'] = $request->jwtUserId;
        $all['jwtUserType'] = $request->jwtUserType;
        return success($ReportlogFn->rapid($all));
    }
    public function reportShow(Request $request,ReportlogFn $ReportlogFn)
    {
        $encrypted = $request->input('encrypted_report') ?? '';
        $iv = $request->input('iv_report') ?? '';
        $data = AESDeCode($encrypted, $iv);
        if(!isset($data['id'])) tryFun('logs_id_not',logs_id_not);
        if(!isset($data['uid'])) tryFun('user_info_not',user_info_not);
        return success($ReportlogFn->reportShow($data));
    }
}
