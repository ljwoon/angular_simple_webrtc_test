import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './component/login/login.component';
import { MeetingComponent } from './component/meeting/meeting.component';

const routes: Routes = [
  {
		path: '',
		component: LoginComponent,
  },
  {
		path: ':id',
		component: MeetingComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
