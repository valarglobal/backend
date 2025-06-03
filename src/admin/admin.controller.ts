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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('/v1/admin')
@Roles(USER_ROLE.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('data/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new data plan' })
  @ApiResponse({ status: 200, description: 'Data plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({type: AddPlanDto})
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addDataPlan(@Body() body: AddPlanDto) {
    return this.adminService.addDataPlan(body);
  }

  @Post('airtime/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new airtime plan' })
  @ApiResponse({ status: 200, description: 'Airtime plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({type: AddPlanDto})
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addAirtimePlan(@Body() body: AddPlanDto) {
    return this.adminService.addAirtimePlan(body);
  }

  @Post('cable/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new cable TV plan' })
  @ApiBody({type: AddCablPlanDto})
  @ApiResponse({ status: 200, description: 'Cable plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addCablePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addCablePlan(body);
  }

  @Post('electricity/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new electricity plan' })
  @ApiBody({type: AddCablPlanDto})
  @ApiResponse({ status: 200, description: 'Electricity plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addElectricityPlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addElectricityPlan(body);
  }

  @Post('internet/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new internet service plan' })
  @ApiBody({type: AddCablPlanDto})
  @ApiResponse({ status: 200, description: 'Internet plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addInternetServicePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addInternetServicePlan(body);
  }

  @Post('transport/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a new transport plan' })
  @ApiBody({type: AddCablPlanDto})
  @ApiResponse({ status: 200, description: 'Transport plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addTransportPlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addTransportPlan(body);
  }

  @Post('schoolfee/add-plan')
  @HttpCode(HttpStatus.OK)
  @ApiBody({type: AddCablPlanDto})
  @ApiOperation({ summary: 'Add a new school fee plan' })
  @ApiResponse({ status: 200, description: 'School fee plan added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async addSchoolFeePlan(@Body() body: AddCablPlanDto) {
    return this.adminService.addSchoolFeePlan(body);
  }

  @Delete('delete-plan/:id/:bill_type')
  @ApiOperation({ summary: 'Delete a plan by ID and bill type' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'bill_type', description: 'Type of bill (data, airtime, cable, etc.)' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async deletePlan(
    @Param('id') id: string,
    @Param('bill_type') bill_type: string,
  ) {
    return this.adminService.deletePlan(id, bill_type.toLowerCase());
  }
}
