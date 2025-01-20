import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { USER_ROLE } from '@prisma/client';
import { Roles } from 'src/guards/roles.decorator';
import { AddPlanDto } from './dto/AddDataPlanDto';
import { AdminService } from './admin.service';
import { AddCablPlanDto } from './dto/AddCablPlanDto';

@Controller('/v1/admin')
@Roles(USER_ROLE.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('data/add-plan')
  @HttpCode(HttpStatus.OK)
  async addDataPlan(@Body() body: AddPlanDto) {
    return this.adminService.addDataPlan(body);
  }

  @Post('airtime/add-plan')
  @HttpCode(HttpStatus.OK)
  async addAirtimePlan(@Body() body: AddPlanDto) {
    return this.adminService.addAirtimePlan(body);
  }

  @Post('cable/add-plan')
  @HttpCode(HttpStatus.OK)
  async addCablePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addCablePlan(body);
  }

  @Post('electricity/add-plan')
  @HttpCode(HttpStatus.OK)
  async addElectricityPlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addElectricityPlan(body);
  }

  @Post('internet/add-plan')
  @HttpCode(HttpStatus.OK)
  async addInternetServicePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addInternetServicePlan(body);
  }

  @Post('transport/add-plan')
  @HttpCode(HttpStatus.OK)
  async addTransportPlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addTransportPlan(body);
  }

  @Post('schoolfee/add-plan')
  @HttpCode(HttpStatus.OK)
  async addSchoolFeePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addSchoolFeePlan(body);
  }

  @Delete('delete-plan/:id/:bill_type')
  async deletePlan(
    @Param('id') id: string,
    @Param('bill_type') bill_type: string,
  ) {
    return this.adminService.deletePlan(id, bill_type.toLowerCase());
  }
}
